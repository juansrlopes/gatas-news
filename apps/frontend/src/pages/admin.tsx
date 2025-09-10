import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { getEnvConfig } from '../../../../libs/shared/utils/src/index';
import { createApiUrl, API_ENDPOINTS } from '../config/api';

interface Celebrity {
  _id: string;
  name: string;
  aliases: string[];
  isActive: boolean;
  totalArticles: number;
  lastFetchedAt?: string;
  avgArticlesPerDay: number;
  createdAt: string;
  updatedAt: string;
}

interface _CelebritiesResponse {
  success: boolean;
  data: {
    celebrities: Celebrity[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
  };
}

const AdminPage = () => {
  console.log('🎯 [DEBUG] AdminPage component rendering...');

  const config = getEnvConfig();
  const [allCelebrities, setAllCelebrities] = useState<Celebrity[]>([]);
  const [filteredCelebrities, setFilteredCelebrities] = useState<Celebrity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);

  // Pagination settings
  const ITEMS_PER_PAGE = 20;

  console.log('🔢 [DEBUG] Current state:', {
    allCelebrities: allCelebrities.length,
    filteredCelebrities: filteredCelebrities.length,
    loading,
    totalResults,
  });
  const [editingCelebrity, setEditingCelebrity] = useState<Celebrity | null>(null);
  const [editName, setEditName] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  // Helper function to show messages
  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000); // Auto-hide after 3 seconds
  };

  // Removed selectedCategory - no longer needed

  // Removed categories - no longer needed

  // Update pagination based on filtered results
  const updatePagination = useCallback((celebrities: Celebrity[], _page: number) => {
    const totalItems = celebrities.length;
    const totalPagesCount = Math.ceil(totalItems / ITEMS_PER_PAGE);
    setTotalPages(totalPagesCount);
    setTotalResults(totalItems);
  }, []);

  // ROBUST: Load ALL celebrities with proper error handling
  const fetchAllCelebrities = useCallback(async () => {
    console.log('🚀 [DEBUG] Starting to fetch ALL celebrities...');
    setLoading(true);

    // Ensure we're on client side
    if (typeof window === 'undefined') {
      console.log('❌ [DEBUG] Not on client side, aborting fetch');
      setLoading(false);
      return;
    }

    // Small delay to ensure API is ready
    await new Promise(resolve => setTimeout(resolve, 100));

    // Test API connectivity first
    try {
      console.log('🏥 [DEBUG] Testing API health...');
      const healthResponse = await fetch(`${createApiUrl('/health')}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!healthResponse.ok) {
        throw new Error(`API health check failed: ${healthResponse.status}`);
      }
      console.log('✅ [DEBUG] API health check passed');
    } catch (healthError) {
      console.error('❌ [DEBUG] API health check failed:', healthError);
      throw new Error(`Cannot connect to API server. Please ensure the API is running on port 8000.`);
    }

    try {
      let allCelebs: Celebrity[] = [];
      let currentPage = 1;
      let hasMore = true;
      const pageSize = 100; // Fetch 100 per page
      const maxRetries = 3;

      while (hasMore) {
        const url = `${createApiUrl(API_ENDPOINTS.ADMIN_CELEBRITIES)}?page=${currentPage}&limit=${pageSize}`;
        console.log(`🌐 [DEBUG] Fetching page ${currentPage} from: ${url}`);

        let retryCount = 0;
        let success = false;

        while (retryCount < maxRetries && !success) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

            console.log(`🌐 [DEBUG] Making fetch request to: ${url}`);
            const response = await fetch(url, {
              signal: controller.signal,
              headers: {
                'Content-Type': 'application/json',
              },
            });

            clearTimeout(timeoutId);
            console.log(`📡 [DEBUG] Page ${currentPage} response status: ${response.status}`);
            console.log(`📡 [DEBUG] Response headers:`, Object.fromEntries(response.headers.entries()));

            if (!response.ok) {
              if (response.status >= 500) {
                throw new Error(`Server error ${response.status} on page ${currentPage}`);
              } else {
                throw new Error(`HTTP ${response.status} on page ${currentPage}`);
              }
            }

            const data = await response.json();
            console.log(`📊 [DEBUG] Page ${currentPage} received:`, {
              celebrities: data.data?.celebrities?.length || 0,
              totalCount: data.data?.totalCount,
              hasMore: data.data?.hasMore
            });

            if (data.success && data.data && data.data.celebrities) {
              const pageCelebrities = data.data.celebrities;
              allCelebs = [...allCelebs, ...pageCelebrities];
              
              // Check if there are more pages
              hasMore = data.data.hasMore || false;
              currentPage++;
              success = true;
              
              console.log(`📈 [DEBUG] Total celebrities so far: ${allCelebs.length}`);
            } else {
              console.error('❌ [DEBUG] Invalid response format on page', currentPage, data);
              hasMore = false;
              success = true; // Don't retry for invalid format
            }

          } catch (fetchError) {
            retryCount++;
            console.warn(`⚠️ [DEBUG] Fetch attempt ${retryCount} failed for page ${currentPage}:`, fetchError);
            console.warn(`⚠️ [DEBUG] Error details:`, {
              name: fetchError instanceof Error ? fetchError.name : 'Unknown',
              message: fetchError instanceof Error ? fetchError.message : String(fetchError),
              stack: fetchError instanceof Error ? fetchError.stack : undefined
            });
            
            if (retryCount >= maxRetries) {
              console.error(`❌ [DEBUG] Max retries reached for page ${currentPage}`);
              if (allCelebs.length > 0) {
                // If we have some data, show what we have
                showMessage('error', `Failed to load all celebrities. Showing ${allCelebs.length} loaded so far.`);
                hasMore = false;
                success = true;
              } else {
                // If no data at all, throw error
                throw new Error(`Failed to fetch celebrities after ${maxRetries} attempts. Error: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`);
              }
            } else {
              // Wait before retry
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            }
          }
        }
      }

      console.log(`✅ [DEBUG] FINAL: Found ${allCelebs.length} total celebrities`);
      setAllCelebrities(allCelebs);
      setFilteredCelebrities(allCelebs);
      setTotalResults(allCelebs.length);
      setTotalPages(Math.ceil(allCelebs.length / ITEMS_PER_PAGE));

      if (allCelebs.length > 0) {
        showMessage('success', `Successfully loaded ${allCelebs.length} celebrities`);
      }

    } catch (error) {
      console.error('❌ [DEBUG] Fetch error:', error);
      setAllCelebrities([]);
      setFilteredCelebrities([]);
      setTotalResults(0);
      setTotalPages(1);
      
      // Show user-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showMessage('error', `Failed to load celebrities: ${errorMessage}`);
    } finally {
      setLoading(false);
      console.log('🏁 [DEBUG] Fetch completed');
    }
  }, [showMessage]);

  // Client-side filtering function
  const filterCelebrities = useCallback(
    (searchQuery: string) => {
      if (!searchQuery.trim()) {
        // No search term - show all celebrities
        setFilteredCelebrities(allCelebrities);
        updatePagination(allCelebrities, 1);
        setCurrentPage(1);
        return;
      }

      const query = searchQuery.toLowerCase().trim();
      const filtered = allCelebrities.filter(celebrity => {
        // Search only in name (aliases removed for simplicity)
        return celebrity.name.toLowerCase().includes(query);
      });

      setFilteredCelebrities(filtered);
      updatePagination(filtered, 1);
      setCurrentPage(1); // Reset to first page when filtering
    },
    [allCelebrities, updatePagination]
  );

  // Get celebrities for current page
  const getCurrentPageCelebrities = useCallback(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredCelebrities.slice(startIndex, endIndex);
  }, [filteredCelebrities, currentPage]);

  // Load all celebrities on mount (client-side only)
  useEffect(() => {
    // Only run on client side
    if (typeof window !== 'undefined') {
      console.log('🎯 [DEBUG] useEffect triggered (client-side), calling fetchAllCelebrities...');
      fetchAllCelebrities();
    } else {
      console.log('🎯 [DEBUG] useEffect triggered (server-side), skipping fetch...');
    }
  }, []); // Empty dependency array - run once on mount

  // Filter celebrities when search term changes
  useEffect(() => {
    filterCelebrities(searchTerm);
  }, [searchTerm, filterCelebrities]);

  const handleSearch = () => {
    // Search happens automatically via useEffect when searchTerm changes
    // This function is kept for the search button, but it's not really needed
    setCurrentPage(1);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    // Filtering happens automatically via useEffect when searchTerm changes
  };

  const handleEditCelebrity = (celebrity: Celebrity) => {
    setEditingCelebrity(celebrity);
    setEditName(celebrity.name);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingCelebrity(null);
    setEditName('');
  };

  const handleOpenAddModal = () => {
    setAddName('');
    setIsAddModalOpen(true);
  };

  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
    setAddName('');
  };

  // Check if celebrity name already exists
  const checkDuplicateName = useCallback((name: string): boolean => {
    const trimmedName = name.trim().toLowerCase();
    return allCelebrities.some(celebrity => 
      celebrity.name.toLowerCase() === trimmedName
    );
  }, [allCelebrities]);

  const handleSaveAdd = async () => {
    const trimmedName = addName.trim();
    
    if (!trimmedName) {
      showMessage('error', 'Name is required');
      return;
    }

    // Check for duplicates before making API call
    if (checkDuplicateName(trimmedName)) {
      showMessage('error', `Celebrity "${trimmedName}" already exists`);
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(createApiUrl(API_ENDPOINTS.ADMIN_CELEBRITIES), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: trimmedName }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const _result = await response.json();
        showMessage('success', `Celebrity "${trimmedName}" added successfully`);
        handleCloseAddModal();
        fetchAllCelebrities(); // Refresh the list
      } else {
        // Handle different error types
        let errorMessage = 'Failed to add celebrity';
        
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch {
          // If response is not JSON, use status-based message
          if (response.status === 400) {
            errorMessage = 'Invalid celebrity data';
          } else if (response.status === 409) {
            errorMessage = `Celebrity "${trimmedName}" already exists`;
          } else if (response.status >= 500) {
            errorMessage = 'Server error. Please try again later.';
          }
        }
        
        showMessage('error', errorMessage);
      }
    } catch (error) {
      console.error('Error adding celebrity:', error);
      
      let errorMessage = 'Error adding celebrity';
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Request timed out. Please check your connection.';
        } else if (error.message.includes('fetch')) {
          errorMessage = 'Cannot connect to server. Please check if the API is running.';
        } else {
          errorMessage = error.message;
        }
      }
      
      showMessage('error', errorMessage);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingCelebrity || !editName.trim()) {
      showMessage('error', 'Name is required');
      return;
    }

    try {
      const response = await fetch(
        createApiUrl(`${API_ENDPOINTS.ADMIN_CELEBRITIES}/${editingCelebrity._id}`),
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: editName.trim(),
          }),
        }
      );

      if (response.ok) {
        showMessage('success', 'Celebrity updated successfully');
        handleCloseEditModal();
        fetchAllCelebrities(); // Reload all celebrities
      } else {
        showMessage('error', 'Failed to update celebrity');
      }
    } catch (error) {
      console.error('Error updating celebrity:', error);
      showMessage('error', 'Error updating celebrity');
    }
  };

  const handleDeleteCelebrity = (id: string, name: string) => {
    setConfirmDelete({ id, name });
  };

  const confirmDeleteCelebrity = async () => {
    if (!confirmDelete) return;

    try {
      const response = await fetch(
        createApiUrl(`${API_ENDPOINTS.ADMIN_CELEBRITIES}/${confirmDelete.id}`),
        {
          method: 'DELETE',
        }
      );

      if (response.ok) {
        showMessage('success', 'Celebrity deleted successfully');
        fetchAllCelebrities(); // Reload all celebrities
        setConfirmDelete(null);
      } else {
        showMessage('error', 'Failed to delete celebrity');
      }
    } catch (error) {
      console.error('Error deleting celebrity:', error);
      showMessage('error', 'Error deleting celebrity');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Head>
        <title>{`${config.appName} - Celebrity Management`}</title>
        <meta name="description" content="Manage celebrities in Gatas News" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-purple-400 hover:text-purple-300 transition-colors">
                ← Back to Site
              </Link>
              <div className="h-6 w-px bg-gray-600"></div>
              <h1 className="text-2xl font-bold text-white">Celebrity Management</h1>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-400">Admin Panel</span>
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Message Display */}
        {message && (
          <div
            className={`mb-4 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-800 border border-green-600 text-green-200'
                : 'bg-red-800 border border-red-600 text-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Header Actions */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div className="mb-4 md:mb-0">
            <h2 className="text-xl font-bold text-white">Celebrities ({totalResults} total)</h2>
            <p className="text-gray-400">Manage your celebrity database</p>
            <p className="text-yellow-400 text-sm">
              DEBUG: All={allCelebrities.length}, Filtered={filteredCelebrities.length}, Loading=
              {loading.toString()}
            </p>
            <button
              onClick={async () => {
                console.log('🔥 [DEBUG] Manual fetch button clicked!');
                try {
                  console.log('🧪 [DEBUG] Testing direct API call...');
                  const testUrl = 'http://localhost:8000/api/v1/admin/celebrities?page=1&limit=1';
                  console.log('🌐 [DEBUG] Test URL:', testUrl);
                  const response = await fetch(testUrl);
                  console.log('📡 [DEBUG] Test response status:', response.status);
                  const data = await response.json();
                  console.log('📊 [DEBUG] Test data:', data);
                  
                  // Now try the full fetch
                  fetchAllCelebrities();
                } catch (error) {
                  console.error('❌ [DEBUG] Test fetch failed:', error);
                }
              }}
              className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs mt-1 transition-colors"
              disabled={loading}
            >
              {loading ? '⏳ Loading...' : '🔥 Manual Fetch Test'}
            </button>
          </div>
          <button
            onClick={handleOpenAddModal}
            className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            + Add Celebrity
          </button>
        </div>

        {/* Search */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-300 mb-2">Search</label>
              <input
                type="text"
                placeholder="Search celebrities..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                onKeyPress={e => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="flex items-end space-x-2">
              <button
                onClick={handleSearch}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Search
              </button>
              <button
                onClick={handleClearSearch}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Celebrity List */}
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading celebrities...</div>
          ) : getCurrentPageCelebrities().length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-gray-400 mb-2">No celebrities found</div>
              <p className="text-gray-500 text-sm">
                {searchTerm
                  ? 'Try adjusting your search criteria'
                  : 'Add your first celebrity to get started'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {getCurrentPageCelebrities().map(celebrity => (
                    <tr key={celebrity._id} className="hover:bg-gray-750">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-white">{celebrity.name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleEditCelebrity(celebrity)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteCelebrity(celebrity._id, celebrity.name)}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-700">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-400">
                  Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
                  {Math.min(currentPage * ITEMS_PER_PAGE, totalResults)} of {totalResults} results
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      const newPage = Math.max(1, currentPage - 1);
                      setCurrentPage(newPage);
                      updatePagination(filteredCelebrities, newPage);
                    }}
                    disabled={currentPage === 1}
                    className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1 text-gray-400">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => {
                      const newPage = Math.min(totalPages, currentPage + 1);
                      setCurrentPage(newPage);
                      updatePagination(filteredCelebrities, newPage);
                    }}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4 border border-gray-700">
            <h3 className="text-lg font-bold text-white mb-4">Edit Celebrity</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Name *</label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter celebrity name"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={handleCloseEditModal}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4 border border-gray-700">
            <h3 className="text-lg font-bold text-white mb-4">Add Celebrity</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Name *</label>
                <input
                  type="text"
                  value={addName}
                  onChange={e => setAddName(e.target.value)}
                  className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-colors ${
                    addName.trim() && checkDuplicateName(addName.trim())
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-600 focus:ring-purple-500'
                  }`}
                  placeholder="Enter celebrity name"
                  onKeyPress={e => e.key === 'Enter' && !checkDuplicateName(addName.trim()) && handleSaveAdd()}
                />
                {addName.trim() && checkDuplicateName(addName.trim()) && (
                  <p className="text-red-400 text-sm mt-1">
                    ⚠️ Celebrity "{addName.trim()}" already exists
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={handleCloseAddModal}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAdd}
                disabled={!addName.trim() || checkDuplicateName(addName.trim())}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  !addName.trim() || checkDuplicateName(addName.trim())
                    ? 'bg-gray-500 cursor-not-allowed text-gray-300'
                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                }`}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4 border border-gray-700">
            <h3 className="text-lg font-bold text-white mb-4">Confirm Delete</h3>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete "{confirmDelete.name}"? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteCelebrity}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
