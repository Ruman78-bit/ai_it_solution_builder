/** Loads the service catalogue and form options once per page load and shares them. */
import { useEffect, useState } from 'react';
import { getCatalogue } from '../services/enquiryService';

let cache = null;
let inflight = null;

export function useCatalogue() {
  const [state, setState] = useState({ data: cache, loading: !cache, error: null });

  const load = () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    inflight = inflight || getCatalogue();
    inflight
      .then((data) => {
        cache = data;
        setState({ data, loading: false, error: null });
      })
      .catch((error) => setState({ data: null, loading: false, error }))
      .finally(() => {
        inflight = null;
      });
  };

  useEffect(() => {
    if (!cache) load();
  }, []);

  return { ...state, retry: load };
}
