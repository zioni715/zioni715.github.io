document.addEventListener("DOMContentLoaded", () => {
  const dropdowns = Array.from(document.querySelectorAll(".nav-dropdown"));

  const closeDropdown = (dropdown) => {
    const toggle = dropdown.querySelector(".nav-dropdown-toggle");
    dropdown.classList.remove("is-open");
    toggle?.setAttribute("aria-expanded", "false");
  };

  dropdowns.forEach((dropdown, index) => {
    const toggle = dropdown.querySelector(".nav-dropdown-toggle");
    const menu = dropdown.querySelector(".nav-dropdown-menu");
    if (!toggle || !menu) return;

    if (!menu.id) menu.id = `research-menu-${index + 1}`;
    toggle.setAttribute("aria-controls", menu.id);
    toggle.setAttribute("aria-expanded", "false");

    toggle.addEventListener("click", (event) => {
      event.stopPropagation();
      const willOpen = !dropdown.classList.contains("is-open");
      dropdowns.forEach(closeDropdown);
      dropdown.classList.toggle("is-open", willOpen);
      toggle.setAttribute("aria-expanded", String(willOpen));
    });

    menu.addEventListener("click", () => closeDropdown(dropdown));
  });

  document.addEventListener("click", () => dropdowns.forEach(closeDropdown));
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    dropdowns.forEach((dropdown) => {
      const toggle = dropdown.querySelector(".nav-dropdown-toggle");
      const wasOpen = dropdown.classList.contains("is-open");
      closeDropdown(dropdown);
      if (wasOpen) toggle?.focus();
    });
  });
});
