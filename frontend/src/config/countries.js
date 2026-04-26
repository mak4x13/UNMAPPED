import axios from "axios";
import { createContext, createElement, useContext, useEffect, useMemo, useState } from "react";


const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:7860";
const CountriesContext = createContext(null);


export function getFlagEmoji(iso2) {
  const letters = String(iso2 || "").toUpperCase();
  if (letters.length !== 2) {
    return "";
  }

  return Array.from(letters)
    .map((letter) => String.fromCodePoint(127397 + letter.charCodeAt(0)))
    .join("");
}


function normalizeCountries(payload) {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload.map((country) => ({
    ...country,
    flag: getFlagEmoji(country.iso2),
  }));
}


export function CountriesProvider({ children }) {
  const [countries, setCountries] = useState([]);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [countriesError, setCountriesError] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadCountries() {
      setLoadingCountries(true);
      setCountriesError(null);
      try {
        const response = await axios.get(`${API_BASE_URL}/api/countries`);
        if (active) {
          setCountries(normalizeCountries(response.data));
        }
      } catch (error) {
        if (active) {
          setCountries([]);
          setCountriesError(error.response?.data?.detail || "Unable to load country list.");
        }
      } finally {
        if (active) {
          setLoadingCountries(false);
        }
      }
    }

    loadCountries();
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      countries,
      loadingCountries,
      countriesError,
      countryCount: countries.length,
      getCountryByCode(code) {
        return countries.find((country) => country.code === code) || null;
      },
    }),
    [countries, loadingCountries, countriesError],
  );

  return createElement(CountriesContext.Provider, { value }, children);
}


export function useCountries() {
  const context = useContext(CountriesContext);
  if (!context) {
    throw new Error("useCountries must be used inside CountriesProvider");
  }
  return context;
}
