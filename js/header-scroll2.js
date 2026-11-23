var header = document.querySelector(".header");
var logo = document.querySelector(".header__site-logo");
var tagline = document.querySelector(".tagline");
var granada = document.querySelector(".granada");
var localData = document.querySelector(".local-data");


window.addEventListener("scroll", onScroll);
var initialPixels = 0;

function onScroll() {
    var currentPixels = window.scrollY;

    if (currentPixels > 200) {
        tagline.classList.add("closed");
        granada.classList.remove("closed");
        localData.classList.remove("closed");
    } 
    else {
        tagline.classList.remove("closed");
        granada.classList.add("closed");
        localData.classList.add("closed");
    }

    // header blend
    if (currentPixels > 200) {
        header.classList.add("header--blend");
    } 
    else {
        header.classList.remove("header--blend");
    }

    // logo
    if (currentPixels > 200) {
        logo.classList.add("header__site-logo--small");
    } 
    else {
        logo.classList.remove("header__site-logo--small");
    }

//add more here
}
