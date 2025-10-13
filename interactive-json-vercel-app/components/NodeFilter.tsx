// components/NodeFilter.tsx
import React from "react";

type NodeFilterProps = {
  // Add real props here once you wire it up
  placeholder?: string;
  onChange?: (value: string) => void;
};

export default function NodeFilter({ placeholder = "Filter…", onChange }: NodeFilterProps) {
  return (
    <input
      type="text"
      placeholder={placeholder}
      onChange={(e) => onChange?.(e.target.value)}
      style={{
        width: "100%",
        padding: "8px 10px",
        borderRadius: 10,
        border: "1px solid #223049",
        background: "#0e141d",
        color: "white",
      }}
    />
  );
}
