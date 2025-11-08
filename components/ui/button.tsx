"use client";

import * as React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({ children, ...props }: ButtonProps) {
  return (
    <button
      className="px-4 py-2 rounded bg-teal-500 text-white disabled:opacity-50"
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
