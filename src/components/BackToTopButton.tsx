import { useEffect, useState } from "react";
import { SquareChevronUp } from 'lucide-react';

const BackToTopButton = () => {
  const [visible, setVisible] = useState(false);

  const toggleVisibility = () => {
    if (window.scrollY > 300) {
      setVisible(true);
    } else {
      setVisible(false);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  return (
    visible && (
      <button
        onClick={scrollToTop}
        className="fixed cursor-pointer bottom-4 right-4 bg-purple-600 text-white p-2 rounded-full shadow-lg"
      >
        <SquareChevronUp />
      </button>
    )
  );
};

export default BackToTopButton;
