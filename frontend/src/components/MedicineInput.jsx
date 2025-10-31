import { useState, useEffect, useRef } from 'react';

const MedicineInput = ({
  value,
  onChange,
  onSelect,
  suggestions = [],
  onSearch,
  placeholder = 'Search medicine...',
  disabled = false,
  error = '',
  className = '',
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [inputValue, setInputValue] = useState(value?.name || '');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef(null);

  // Update input value when value prop changes
  useEffect(() => {
    setInputValue(value?.name || '');
  }, [value]);

  // Handle clicks outside the component
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [wrapperRef]);

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    // Call onChange with the raw input value
    if (onChange) {
      onChange({
        target: {
          name: props.name,
          value: newValue
        }
      });
    }
    
    // Show suggestions if input is not empty
    if (newValue.trim().length > 0) {
      setShowSuggestions(true);
      if (onSearch) {
        onSearch(newValue);
      }
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSelect = (suggestion) => {
    setInputValue(suggestion.name);
    setShowSuggestions(false);
    
    // Call onSelect with the selected suggestion
    if (onSelect) {
      onSelect(suggestion);
    }
    
    // Also call onChange with the selected value
    if (onChange) {
      onChange({
        target: {
          name: props.name,
          value: suggestion.name
        }
      });
    }
  };

  const handleFocus = (e) => {
    setIsFocused(true);
    if (inputValue.trim().length > 0) {
      setShowSuggestions(true);
    }
    if (props.onFocus) {
      props.onFocus(e);
    }
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    // Small timeout to allow click on suggestions before hiding them
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
    if (props.onBlur) {
      props.onBlur(e);
    }
  };

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          placeholder={placeholder}
          className={`block w-full rounded-md border ${
            error 
              ? 'border-red-300 text-red-900 placeholder-red-300 focus:outline-none focus:ring-red-500 focus:border-red-500' 
              : 'border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500'
          } sm:text-sm py-2 px-3 pr-10 ${disabled ? 'bg-gray-100' : 'bg-white'}`}
          autoComplete="off"
          {...props}
        />
        {inputValue && !disabled && (
          <button
            type="button"
            onClick={() => {
              setInputValue('');
              setShowSuggestions(false);
              if (onChange) {
                onChange({
                  target: {
                    name: props.name,
                    value: ''
                  }
                });
              }
            }}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
          {suggestions.map((suggestion, index) => (
            <div
              key={`${suggestion.id || suggestion.name}-${index}`}
              className="text-gray-900 cursor-default select-none relative py-2 pl-3 pr-9 hover:bg-blue-50"
              onClick={() => handleSelect(suggestion)}
            >
              <div className="flex items-center">
                <span className="font-medium truncate">
                  {suggestion.name}
                </span>
                {suggestion.strength && (
                  <span className="ml-2 text-gray-500 text-xs">
                    {suggestion.strength}
                  </span>
                )}
              </div>
              {suggestion.category && (
                <span className="text-xs text-gray-500 mt-1 block">
                  {suggestion.category}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
      
      {showSuggestions && suggestions.length === 0 && inputValue.trim() && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
          <div className="text-gray-500 py-2 px-3 text-center">
            No medications found
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicineInput;
