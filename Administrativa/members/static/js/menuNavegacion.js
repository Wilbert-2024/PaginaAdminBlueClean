const sidebar = document.querySelector('.sidebar');
const menuToggle = sidebar?.querySelector('.menu-toggle');

if (sidebar && menuToggle) {
    const toggleIcon = menuToggle.querySelector('i');

    menuToggle.addEventListener('click', () => {
        const isOpen = sidebar.classList.toggle('is-open');

        menuToggle.setAttribute('aria-expanded', String(isOpen));
        menuToggle.setAttribute(
            'aria-label',
            isOpen ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'
        );
        toggleIcon?.classList.toggle('fa-bars', !isOpen);
        toggleIcon?.classList.toggle('fa-xmark', isOpen);
    });
}