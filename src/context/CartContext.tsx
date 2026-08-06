import { createContext, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from "react";

export type CartItem = {
  key: string; // `${type}:${id}`
  type: "unit" | "kit";
  id: string;
  name: string;
  price: number;
  image?: string;
  quantity: number;
};

const STORAGE_KEY = "digimarket_cart";
const MAX_KIT_QUANTITY = 5;

type Action =
  | { type: "HYDRATE"; items: CartItem[] }
  | { type: "ADD"; item: Omit<CartItem, "quantity">; quantity: number }
  | { type: "REMOVE"; key: string }
  | { type: "SET_QUANTITY"; key: string; quantity: number }
  | { type: "CLEAR" };

function reducer(state: CartItem[], action: Action): CartItem[] {
  switch (action.type) {
    case "HYDRATE":
      return action.items;
    case "ADD": {
      const existing = state.find((i) => i.key === action.item.key);
      if (action.item.type === "unit") {
        // One-of-a-kind — already in the bag is a no-op, never a second line.
        return existing ? state : [...state, { ...action.item, quantity: 1 }];
      }
      if (existing) {
        const quantity = Math.min(existing.quantity + action.quantity, MAX_KIT_QUANTITY);
        return state.map((i) => (i.key === action.item.key ? { ...i, quantity } : i));
      }
      return [...state, { ...action.item, quantity: Math.min(action.quantity, MAX_KIT_QUANTITY) }];
    }
    case "REMOVE":
      return state.filter((i) => i.key !== action.key);
    case "SET_QUANTITY":
      return state.map((i) =>
        i.key === action.key ? { ...i, quantity: Math.max(1, Math.min(MAX_KIT_QUANTITY, action.quantity)) } : i
      );
    case "CLEAR":
      return [];
    default:
      return state;
  }
}

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (item: Omit<CartItem, "key" | "quantity">, quantity?: number) => void;
  removeItem: (key: string) => void;
  setQuantity: (key: string, quantity: number) => void;
  pruneItems: (ids: string[]) => void;
  isInCart: (type: "unit" | "kit", id: string) => boolean;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, dispatch] = useReducer(reducer, []);
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) dispatch({ type: "HYDRATE", items: JSON.parse(raw) as CartItem[] });
    } catch {
      // Corrupt/blocked storage — start with an empty cart rather than crash.
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return; // avoid clobbering storage with the initial empty state
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const value = useMemo<CartContextValue>(() => {
    const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    return {
      items,
      itemCount,
      subtotal,
      isOpen,
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
      addItem: (item, quantity = 1) => {
        dispatch({ type: "ADD", item: { ...item, key: `${item.type}:${item.id}` }, quantity });
      },
      removeItem: (key) => dispatch({ type: "REMOVE", key }),
      setQuantity: (key, quantity) => dispatch({ type: "SET_QUANTITY", key, quantity }),
      pruneItems: (ids) => {
        for (const id of ids) {
          const stale = items.find((i) => i.id === id);
          if (stale) dispatch({ type: "REMOVE", key: stale.key });
        }
      },
      isInCart: (type, id) => items.some((i) => i.key === `${type}:${id}`),
      clear: () => dispatch({ type: "CLEAR" }),
    };
  }, [items, isOpen]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
