import { useState, useCallback } from 'react';
import type { Tourist, TouristErrors, BookingValidationErrors } from '../../types/booking';
import { validateTouristFields } from '../../utils/validation/touristValidation';

interface UseTouristsReturn {
  tourists: Tourist[];
  errors: BookingValidationErrors;
  updateTourist: (index: number, key: keyof Tourist, value: string | boolean | number, additionalUpdates?: Partial<Tourist>) => void;
  setTourists: (tourists: Tourist[]) => void;
  setErrors: (errors: BookingValidationErrors) => void;
  clearTouristError: (index: number, field: keyof TouristErrors) => void;
  clearFieldError: (field: 'email' | 'phone') => void;
}

export const useTourists = (initialTourists: Tourist[] = []): UseTouristsReturn => {
  const [tourists, setTourists] = useState<Tourist[]>(initialTourists);
  const [errors, setErrors] = useState<BookingValidationErrors>({});

  const updateTourist = useCallback((
    index: number,
    key: keyof Tourist,
    value: string | boolean | number,
    additionalUpdates?: Partial<Tourist>
  ) => {
    setTourists((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [key]: value,
        ...(additionalUpdates || {}),
      };
      return updated;
    });

    // Clear error for this field (only if it's a validatable field)
    if (key !== 'noPatronymic' && key !== 'child' && key !== 'child_age') {
      const errorKey = key as keyof TouristErrors;
      if (errors.tourists?.[index]?.[errorKey]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          if (newErrors.tourists?.[index]) {
            const touristErrors = { ...newErrors.tourists[index] };
            delete touristErrors[errorKey];
            if (Object.keys(touristErrors).length === 0) {
              const tourists = { ...newErrors.tourists };
              delete tourists[index];
              if (Object.keys(tourists).length === 0) {
                delete newErrors.tourists;
              } else {
                newErrors.tourists = tourists;
              }
            } else {
              newErrors.tourists = { ...newErrors.tourists, [index]: touristErrors };
            }
          }
          return newErrors;
        });
      }
    }
  }, [errors]);

  const clearTouristError = useCallback((index: number, field: keyof TouristErrors) => {
    setErrors((prev) => {
      const newErrors = { ...prev };
      if (newErrors.tourists?.[index]) {
        const touristErrors = { ...newErrors.tourists[index] };
        delete touristErrors[field];
        if (Object.keys(touristErrors).length === 0) {
          const tourists = { ...newErrors.tourists };
          delete tourists[index];
          if (Object.keys(tourists).length === 0) {
            delete newErrors.tourists;
          } else {
            newErrors.tourists = tourists;
          }
        } else {
          newErrors.tourists = { ...newErrors.tourists, [index]: touristErrors };
        }
      }
      return newErrors;
    });
  }, []);

  const clearFieldError = useCallback((field: 'email' | 'phone') => {
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  return {
    tourists,
    errors,
    updateTourist,
    setTourists,
    setErrors,
    clearTouristError,
    clearFieldError,
  };
};

