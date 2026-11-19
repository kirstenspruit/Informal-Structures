
// Clock
function clock() {
    var now = new Date();

    var localTime = now.toLocaleTimeString("es-ES", {timeZone: "Europe/Madrid"});
    document.getElementById("local-time").innerHTML = localTime;

    var date = now.toLocaleDateString("es-ES", {timeZone: "Europe/Madrid"});
    document.querySelector("#date").innerHTML = date;

    var weekday = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    // Now we can ask for the number and translate it to the corresponding item in our list of days.
    var day = weekday[now.getDay()];
    // document.querySelector("#weekday").innerHTML = day;

}

document.addEventListener("DOMContentLoaded", () => {
    clock();
    setInterval(clock, 1000);
});
