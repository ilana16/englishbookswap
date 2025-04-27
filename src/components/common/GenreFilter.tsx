import { Check } from "lucide-react";
import { useState, useEffect } from "react";

interface GenreFilterProps {
  selectedGenres: string[];
  onChange: (genres: string[]) => void;
  availableGenres: string[];
}

export function GenreFilter({
  selectedGenres,
  onChange,
  availableGenres
}: GenreFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleGenre = (genre: string) => {
    if (selectedGenres.includes(genre)) {
      onChange(selectedGenres.filter(g => g !== genre));
    } else {
      onChange([...selectedGenres, genre]);
    }
  };

  const toggleAll = () => {
    if (selectedGenres.length === availableGenres.length) {
      // If all are selected, deselect all
      onChange([]);
    } else {
      // If not all are selected, select all
      onChange([...availableGenres]);
    }
  };

  const allSelected = selectedGenres.length === availableGenres.length;

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-2 text-sm border border-border rounded-md bg-white"
      >
        <span>
          {selectedGenres.length === 0
            ? "All Genres"
            : `${selectedGenres.length} selected`}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? "transform rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
          <div className="p-2">
            <div 
              className="flex items-center px-2 py-1 rounded-sm hover:bg-muted cursor-pointer border-b border-border mb-1"
              onClick={toggleAll}
            >
              <div className="w-4 h-4 mr-2 border border-border rounded-sm flex items-center justify-center">
                {allSelected && <Check className="w-3 h-3 text-primary" />}
              </div>
              <span className="text-sm font-medium">Select All</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
              {availableGenres.map(genre => (
                <div
                  key={genre}
                  className="flex items-center px-2 py-1 rounded-sm hover:bg-muted cursor-pointer"
                  onClick={() => toggleGenre(genre)}
                >
                  <div className="w-4 h-4 mr-2 border border-border rounded-sm flex items-center justify-center">
                    {selectedGenres.includes(genre) && (
                      <Check className="w-3 h-3 text-primary" />
                    )}
                  </div>
                  <span className="text-sm">{genre}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
