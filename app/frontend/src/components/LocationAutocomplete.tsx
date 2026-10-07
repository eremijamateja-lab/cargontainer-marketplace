import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { MapPin, Loader2 } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || '';

interface LocationResult {
  id: number;
  country_code: string;
  country_name: string;
  postal_code: string | null;
  city: string;
  location_name: string;
  location_type: string | null;
}

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onLocationSelect?: (location: LocationResult) => void;
  countryCode?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export default function LocationAutocomplete({
  value,
  onChange,
  onLocationSelect,
  countryCode,
  placeholder = 'Search city or postal code...',
  disabled = false,
  className = '',
}: LocationAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<LocationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch suggestions with debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value || value.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({ search: value, limit: '8' });
        if (countryCode) params.set('country_code', countryCode);

        const res = await fetch(`${API_BASE}/api/v1/entities/locations/autocomplete?${params}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data);
          setShowDropdown(data.length > 0);
          setHighlightIndex(-1);
        }
      } catch {
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, countryCode]);

  const handleSelect = (location: LocationResult) => {
    onChange(location.location_name);
    onLocationSelect?.(location);
    setShowDropdown(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && highlightIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[highlightIndex]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  const getTypeIcon = (type: string | null) => {
    switch (type) {
      case 'port': return '⚓';
      case 'airport': return '✈️';
      case 'terminal': return '🏗️';
      default: return '🏙️';
    }
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div className="relative">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="pr-8 border-gray-300"
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
          {isLoading ? (
            <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
          ) : (
            <MapPin className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>

      {showDropdown && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((loc, idx) => (
            <button
              key={loc.id}
              type="button"
              onClick={() => handleSelect(loc)}
              className={`w-full text-left px-3 py-2.5 flex items-center gap-2.5 text-sm transition-colors ${
                idx === highlightIndex
                  ? 'bg-blue-50 text-blue-900'
                  : 'hover:bg-gray-50 text-gray-700'
              }`}
            >
              <span className="text-base shrink-0">{getTypeIcon(loc.location_type)}</span>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{loc.location_name}</div>
                <div className="text-xs text-gray-400">{loc.country_name}</div>
              </div>
              <span className="text-xs text-gray-400 shrink-0">{loc.country_code}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}