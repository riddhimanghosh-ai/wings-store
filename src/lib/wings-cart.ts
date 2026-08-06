"use client";

import { useCallback, useEffect, useState } from "react";

/** The live app tracks box and piece quantities separately per SKU. */
export type CartLine = { box: number; pcs: number };
export type Cart = Record<string, CartLine>;

const KEY = "wings_online_cart";
const EVENT = "wings-cart-change";

export function readCart(): Cart {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Cart;
  } catch {
    return {};
  }
}

export function writeCart(cart: Cart) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(cart));
  window.dispatchEvent(new Event(EVENT));
}

export function useCart() {
  const [cart, setCart] = useState<Cart>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setCart(readCart());
    setReady(true);
    const onChange = () => setCart(readCart());
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);

  const setLine = useCallback((productId: string, line: Partial<CartLine>) => {
    const current = readCart();
    const existing = current[productId] ?? { box: 0, pcs: 0 };
    const next: CartLine = {
      box: Math.max(0, line.box ?? existing.box),
      pcs: Math.max(0, line.pcs ?? existing.pcs),
    };
    if (next.box === 0 && next.pcs === 0) delete current[productId];
    else current[productId] = next;
    writeCart(current);
  }, []);

  const removeLine = useCallback((productId: string) => {
    const current = readCart();
    delete current[productId];
    writeCart(current);
  }, []);

  const clear = useCallback(() => writeCart({}), []);

  const itemCount = Object.keys(cart).length;

  return { cart, ready, setLine, removeLine, clear, itemCount };
}
