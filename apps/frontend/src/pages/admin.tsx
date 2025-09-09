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

interface CelebritiesResponse {
  success: boolean;
  data: {
    celebrities: Celebrity[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
  };
}

const AdminPage = () => {
  const config = getEnvConfig();
  const [celebrities, setCelebrities] = useState<Celebrity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [editingCelebrity, setEditingCelebrity] = useState<Celebrity | null>(null);
  const [editName, setEditName] = useState('');
  const [editAliases, setEditAliases] = useState('');
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

  useEffect(() => {
    fetchCelebrities();
  }, [currentPage, fetchCelebrities]);

  const fetchCelebrities = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(searchTerm && { q: searchTerm }),
      });

      const response = await fetch(createApiUrl(`${API_ENDPOINTS.ADMIN_CELEBRITIES}?${params}`));

      if (response.ok) {
        const data: CelebritiesResponse = await response.json();
        setCelebrities(data.data.celebrities);
        setTotalPages(data.data.totalPages);
        setTotalResults(data.data.totalCount);
      } else {
        console.error('Failed to fetch celebrities');
        setCelebrities([]);
        setTotalResults(0);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Error fetching celebrities:', error);
      setCelebrities([]);
      setTotalResults(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm]);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchCelebrities();
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setCurrentPage(1);
    fetchCelebrities();
  };

  const handleEditCelebrity = (celebrity: Celebrity) => {
    setEditingCelebrity(celebrity);
    setEditName(celebrity.name);
    setEditAliases(celebrity.aliases.join(', '));
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingCelebrity(null);
    setEditName('');
    setEditAliases('');
  };

  const handleOpenAddModal = () => {
    setAddName('');
    setIsAddModalOpen(true);
  };

  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
    setAddName('');
  };

  const handleSaveAdd = async () => {
    if (!addName.trim()) {
      showMessage('error', 'Name is required');
      return;
    }

    try {
      const response = await fetch(createApiUrl(API_ENDPOINTS.ADMIN_CELEBRITIES), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: addName.trim(),
        }),
      });

      if (response.ok) {
        showMessage('success', 'Celebrity added successfully');
        handleCloseAddModal();
        fetchCelebrities();
      } else {
        showMessage('error', 'Failed to add celebrity');
      }
    } catch (error) {
      console.error('Error adding celebrity:', error);
      showMessage('error', 'Error adding celebrity');
    }
  };

  const handleSaveEdit = async () => {
    if (!editingCelebrity || !editName.trim()) {
      showMessage('error', 'Name is required');
      return;
    }

    try {
      const aliases = editAliases
        .split(',')
        .map(alias => alias.trim())
        .filter(alias => alias);

      const response = await fetch(
        createApiUrl(`${API_ENDPOINTS.ADMIN_CELEBRITIES}/${editingCelebrity._id}`),
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: editName.trim(),
            aliases: aliases,
          }),
        }
      );

      if (response.ok) {
        showMessage('success', 'Celebrity updated successfully');
        handleCloseEditModal();
        fetchCelebrities();
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
        fetchCelebrities();
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
          ) : celebrities.length === 0 ? (
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
                  {celebrities.map(celebrity => (
                    <tr key={celebrity._id} className="hover:bg-gray-750">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-white">{celebrity.name}</div>
                          {celebrity.aliases.length > 0 && (
                            <div className="text-sm text-gray-400">
                              Aliases: {celebrity.aliases.join(', ')}
                            </div>
                          )}
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
                  Showing {(currentPage - 1) * 20 + 1} to {Math.min(currentPage * 20, totalResults)}{' '}
                  of {totalResults} results
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1 text-gray-400">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
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

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Aliases</label>
                <input
                  type="text"
                  value={editAliases}
                  onChange={e => setEditAliases(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Alternative names, separated by commas"
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
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter celebrity name"
                  onKeyPress={e => e.key === 'Enter' && handleSaveAdd()}
                />
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
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
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
