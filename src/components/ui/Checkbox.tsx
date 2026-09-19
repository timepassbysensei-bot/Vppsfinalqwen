import { forwardRef, type InputHTMLAttributes } from "react";

export const Checkbox = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Checkbox(
  { className = "", ...rest }, ref,
) {
  return (
    <input
      ref={ref}
      type="checkbox"
      className={`h-4 w-4 rounded border-lightgray text-navy focus:ring-problue ${className}`}
      {...rest}
    />
  );
});
