let highContrast = false;

function toggleContrast() {
    highContrast = !highContrast;
    if (highContrast) {
        body.classList.add('high-contrast');
    } else {
        body.classList.remove('high-contrast');
    }
}