import { useEffect, useState } from 'react';
import { onSnapshot } from 'firebase/firestore';
import { ref, onValue } from 'firebase/database';
import { rtdb } from '../firebase.js';

// Live-subscribes to a Firestore query. Pass deps to re-subscribe when inputs change.
export function useCollection(queryRef, deps = []) {
  const [docs, setDocs] = useState(null);
  useEffect(() => {
    if (!queryRef) return;
    return onSnapshot(queryRef, (snap) => {
      setDocs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return docs; // null while loading
}

export function useDoc(docRef, deps = []) {
  const [data, setData] = useState(null);
  useEffect(() => {
    if (!docRef) return;
    return onSnapshot(docRef, (snap) => {
      setData(snap.exists() ? { id: snap.id, ...snap.data() } : undefined);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return data; // null loading, undefined missing
}

// Live-subscribes to a Realtime Database path. Pass a falsy path to skip.
export function useRtdb(path, deps = []) {
  const [val, setVal] = useState(null);
  useEffect(() => {
    if (!path) { setVal(null); return; }
    return onValue(ref(rtdb, path), (snap) => {
      setVal(snap.exists() ? snap.val() : undefined);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return val; // null loading/skipped, undefined missing
}
