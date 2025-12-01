import { useState, useRef, useEffect } from 'react';
import './Dropdown.css';

export default function Dropdown({ value, options, onChange, label, fullWidth }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const selectedOption = options.find(opt => opt.value === value);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on escape
  useEffect(() => {
    function handleEscape(e) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  return (
    <div className={`dropdown ${fullWidth ? 'dropdown--full' : ''}`} ref={dropdownRef}>
      {label && <span className="dropdown__label">{label}</span>}
      <button
        className={`dropdown__trigger ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        {selectedOption?.icon && (
          <img src={selectedOption.icon} alt="" className="dropdown__icon" />
        )}
        <span className="dropdown__value">{selectedOption?.label}</span>
        <svg
          className="dropdown__arrow"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div className="dropdown__menu">
          {options.map(option => (
            <button
              key={option.value}
              className={`dropdown__option ${option.value === value ? 'selected' : ''}`}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              type="button"
            >
              {option.icon && (
                <img src={option.icon} alt="" className="dropdown__option-icon" />
              )}
              {option.label}
              {option.value === value && (
                <svg
                  className="dropdown__check"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
