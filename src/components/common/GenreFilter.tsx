import { Check, Search } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";

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
  const [searchTerm, setSearchTerm] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

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

  // Filter genres based on search term
  const filteredGenres = searchTerm.trim() === "" 
    ? availableGenres 
    : availableGenres.filter(genre => 
        genre.toLowerCase().includes(searchTerm.toLowerCase())
      );

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
            {/* Search input */}
            <div className="mb-2 relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                ref={searchInputRef}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search genres..."
                className="pl-8 py-1 h-8 text-sm"
                onClick={(e) => e.stopPropagation()}
              />
              {searchTerm && (
                <button
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearchTerm("");
                    searchInputRef.current?.focus();
                  }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            
            <div 
              className="flex items-center px-2 py-1 rounded-sm hover:bg-muted cursor-pointer border-b border-border mb-1"
              onClick={toggleAll}
            >
              <div className="w-4 h-4 mr-2 border border-border rounded-sm flex items-center justify-center">
                {allSelected && <Check className="w-3 h-3 text-primary" />}
              </div>
              <span className="text-sm font-medium">Select All</span>
            </div>
            
            {filteredGenres.length === 0 ? (
              <div className="py-2 px-2 text-sm text-muted-foreground text-center">
                No genres match your search
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                {filteredGenres.map(genre => (
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
            )}
          </div>
        </div>
      )}
    </div>
  );
}
