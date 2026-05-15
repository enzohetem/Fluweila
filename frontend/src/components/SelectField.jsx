import { Check, ChevronDown } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export default function SelectField({
  label,
  value,
  options,
  onChange,
  placeholder = "Selecione",
  disabled = false,
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState(null);
  const ref = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const selected = options.find(
    (option) => String(option.value) === String(value),
  );

  useEffect(() => {
    function handleClickOutside(event) {
      const insideTrigger = ref.current && ref.current.contains(event.target);
      const insideMenu =
        menuRef.current && menuRef.current.contains(event.target);

      if (!insideTrigger && !insideMenu) {
        setOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      return undefined;
    }

    function updateMenuPosition() {
      const rect = triggerRef.current.getBoundingClientRect();
      setMenuStyle({
        left: `${rect.left}px`,
        top: `${rect.bottom + 6}px`,
        width: `${rect.width}px`,
      });
    }

    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open]);

  function selectOption(option) {
    onChange(option.value);
    setOpen(false);
  }

  return (
    <div className={`select-field ${className}`} ref={ref}>
      {label ? <span className="select-label">{label}</span> : null}
      <button
        ref={triggerRef}
        className={`select-trigger ${open ? "open" : ""}`}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{selected?.label || placeholder}</span>
        <ChevronDown size={18} />
      </button>

      {open && menuStyle
        ? createPortal(
            <div
              ref={menuRef}
              className="select-menu select-menu-portal"
              role="listbox"
              style={menuStyle}
            >
              {options.map((option) => {
                const active = String(option.value) === String(value);

                return (
                  <button
                    key={option.value}
                    className={`select-option ${active ? "active" : ""}`}
                    type="button"
                    role="option"
                    aria-selected={active}
                    data-value={option.value}
                    onClick={() => selectOption(option)}
                  >
                    <span>{option.label}</span>
                    {active ? <Check size={16} /> : null}
                  </button>
                );
              })}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
