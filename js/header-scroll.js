var header = document.querySelector(".header");
var logo = document.querySelector(".header__site-logo");

window.addEventListener("scroll", onScroll);
var initialPixels = 0;

function onScroll() {
    var currentPixels = window.scrollY;

    // header size
    if (currentPixels > 10) {
        header.classList.add("header--small");
    } 
    else {
        header.classList.remove("header--small");
    }

    // header blend
    if (currentPixels > 1000) {
        header.classList.add("header--blend");
    } 
    else {
        header.classList.remove("header--blend");
    }

    // logo
    if (currentPixels > 300) {
        logo.classList.add("header__site-logo--small");
    } 
    else {
        logo.classList.remove("header__site-logo--small");
    }

//add more here
}
