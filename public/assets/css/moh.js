// التحقق من وجود العنصر قبل إضافة المستمع
var navToggler = document.querySelector('.navbar-toggler');
if (navToggler) {
    navToggler.addEventListener('click', function () {
        var nav = document.getElementById('responsive-navbar-nav');
        if (nav) {
            nav.classList.toggle('collapse');
        }
    });
}

// Ù„Ø¬Ø¹Ù„ Ø²Ø± Ø§Ù„Ø±Ø¬ÙˆØ¹ Ø¥Ù„Ù‰ Ø§Ù„Ø£Ø¹Ù„Ù‰ ÙŠØ¸Ù‡Ø± Ø¹Ù†Ø¯ Ø§Ù„ØªÙ…Ø±ÙŠØ± Ù„Ø£Ø³ÙÙ„ Ø§Ù„ØµÙØ­Ø©
window.onscroll = function () {
    var topButton = document.getElementById('top-button');
    if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
        topButton.style.display = "block";
    } else {
        topButton.style.display = "none";
    }
};

// Ù„Ø¥Ø±Ø¬Ø§Ø¹ Ø§Ù„ØµÙØ­Ø© Ø¥Ù„Ù‰ Ø§Ù„Ø£Ø¹Ù„Ù‰ Ø¹Ù†Ø¯ Ø§Ù„Ø¶ØºØ· Ø¹Ù„Ù‰ Ø²Ø± Ø§Ù„Ø±Ø¬ÙˆØ¹ Ø¥Ù„Ù‰ Ø§Ù„Ø£Ø¹Ù„Ù‰
var topButton = document.getElementById('top-button');
if (topButton) {
    topButton.addEventListener('click', function () {
        document.body.scrollTop = 0; // For Safari
        document.documentElement.scrollTop = 0; // For Chrome, Firefox, IE and Opera
    });
}
document.addEventListener("DOMContentLoaded", function () {
    // التحقق من وجود النموذج قبل ربط الحدث
    var form = document.querySelector("form");
    if (form) {
        form.addEventListener("submit", validateForm);
    }
});

function validateForm(event) {
    event.preventDefault(); // Ù…Ù†Ø¹ Ø§Ù„Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„Ø§ÙØªØ±Ø§Ø¶ÙŠ Ù„Ù„Ù†Ù…ÙˆØ°Ø¬

    // Ø§Ù„Ø­ØµÙˆÙ„ Ø¹Ù„Ù‰ Ù‚ÙŠÙ…Ø© Ø±Ù‚Ù… Ø§Ù„Ù‡ÙˆÙŠØ©
    let idNumber = document.getElementById("Identification_number").value;

    // Ø¥Ø®ÙØ§Ø¡ Ø¬Ù…ÙŠØ¹ Ø±Ø³Ø§Ø¦Ù„ Ø§Ù„Ø®Ø·Ø£ Ù‚Ø¨Ù„ Ø§Ù„ÙØ­Øµ
    document.getElementById("error-message").style.display = "none";
    document.getElementById("alerterror").style.display = "none";
    document.getElementById("alerterror2").style.display = "none";

    // Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ø±Ù‚Ù… Ø§Ù„Ù‡ÙˆÙŠØ© (ÙŠØ¬Ø¨ Ø£Ù† ÙŠÙƒÙˆÙ† 10 Ø£Ø±Ù‚Ø§Ù… ØµØ­ÙŠØ­Ø©)
    if (idNumber.length !== 10 || isNaN(idNumber)) {
        document.getElementById("error-message").style.display = "block"; // Ø¹Ø±Ø¶ Ø±Ø³Ø§Ù„Ø© Ø§Ù„Ø®Ø·Ø£
        return false;
    }

    // **Ù…Ø­Ø§ÙƒØ§Ø© Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª ÙˆØ¥Ø¸Ù‡Ø§Ø± Ø§Ù„Ø£Ø®Ø·Ø§Ø¡ Ø§Ù„Ù…Ø®ØªÙ„ÙØ©**
    let randomError = Math.floor(Math.random() * 3); // Ø§Ø®ØªÙŠØ§Ø± Ø®Ø·Ø£ Ø¹Ø´ÙˆØ§Ø¦ÙŠ Ù„Ø§Ø®ØªØ¨Ø§Ø± Ø§Ù„Ø±Ø³Ø§Ø¦Ù„

    if (randomError === 1) {
        document.getElementById("alerterror").style.display = "block"; // Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ù†ØªØ§Ø¦Ø¬
        return false;
    } else if (randomError === 2) {
        document.getElementById("alerterror2").style.display = "block"; // Ø®Ø·Ø£ ÙÙŠ Ø§Ù„Ø§Ø³ØªØ¹Ù„Ø§Ù…
        return false;
    }

    // Ø¥Ø°Ø§ Ù„Ù… ÙŠÙƒÙ† Ù‡Ù†Ø§Ùƒ Ø£Ø®Ø·Ø§Ø¡ØŒ ÙŠÙ…ÙƒÙ† Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„Ù†Ù…ÙˆØ°Ø¬
    document.forms[0].submit();
}