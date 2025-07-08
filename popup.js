document.addEventListener('DOMContentLoaded', function () {

    function showOnlyPage(pageToShow) {
        const pages = [pageOne, pageTwo, pageSeven]; // Kept relevant pages
        pages.forEach(page => page.style.display = 'none');
        pageToShow.style.display = 'flex';
    
        if (pageToShow !== pageTwo) {
            settingsIcon.classList.remove('activated');
        }
        if (pageToShow !== pageSeven) {
            updatesIcon.classList.remove('activated');
        }
    }    
    
    // Set up the UI to be in the "activated" state by default.
    function setupInitialUI() {
        document.getElementById("settings_icon").style.display = "flex";
        document.getElementById("toggleButton").classList.add("paid");
        document.getElementById("status").classList.add("paid");
        document.querySelectorAll("#statusReader").forEach(element => element.innerHTML = "ACTIVATED");
    }
    
    // Run the initial UI setup
    setupInitialUI();

    // --- Settings, Updates, and Page Navigation Logic ---
    const settingsIcon = document.getElementById("settings_icon");
    const updatesIcon = document.getElementById("updates_icon");
    const settingsBackIcon = document.getElementById("settings_back");
    const pageOne = document.getElementById("p1");
    const pageTwo = document.getElementById("p2");
    const pageSeven = document.getElementById("p7");

    settingsIcon.addEventListener("click", () => {
        settingsIcon.classList.toggle("activated");
        updatesIcon.classList.remove("activated"); 
        if (pageTwo.style.display === 'flex') {
            showOnlyPage(pageOne);
        } else {
            showOnlyPage(pageTwo);
        }
    });

    updatesIcon.addEventListener("click", () => {
        updatesIcon.classList.toggle("activated");
        settingsIcon.classList.remove("activated"); 
        if (pageSeven.style.display === 'flex') {
            showOnlyPage(pageOne);
        } else {
            showOnlyPage(pageSeven);
        }
    });

    settingsBackIcon.addEventListener('click', function () {
        showOnlyPage(pageOne);
        settingsIcon.classList.remove('activated');
    });

    document.getElementById('updates_back').addEventListener('click', function () {
        showOnlyPage(pageOne);
        updatesIcon.classList.remove('activated');
    });

    // --- Kiosk Bar Toggle Logic ---
    document.getElementById('toggleButton').addEventListener('click', function () {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            chrome.tabs.sendMessage(tabs[0].id, { action: "toggleBar" });
        });
    });

    // --- URL Blocker Logic ---
    const urlInput = document.getElementById('urlInput');
    const urlContainer = document.getElementById('urlContainer');
    const saveUrlsButton = document.getElementById('saveUrls');

    chrome.storage.local.get(['blockedUrls'], function (result) {
        if (result.blockedUrls) {
            result.blockedUrls.forEach(addUrlToUI);
        }
    });

    function saveUrls() {
        const urls = Array.from(new Set(Array.from(urlContainer.children).map(div => div.textContent.trim().replace('×', ''))));
        chrome.storage.local.set({ blockedUrls: urls }, function () {
            console.log('Blocked URLs saved.');
            chrome.runtime.sendMessage({ action: 'updateBlockedUrls' });
        });
    }    

    saveUrlsButton.addEventListener('click', function () {
        addUrlsFromInput();
        saveUrls();
    });

    function addUrlsFromInput() {
        const inputUrls = urlInput.value.split(',').map(url => url.trim());
        const existingUrls = Array.from(urlContainer.children).map(div => div.textContent.trim().replace('×', ''));
        const newUrls = inputUrls.filter(url => url.length > 0 && !existingUrls.includes(url));
        newUrls.forEach(addUrlToUI);
        urlInput.value = '';
        saveUrls();
    }

    function addUrlToUI(url) {
        if (!url) return;
        const urlContainerDiv = document.createElement('div');
        urlContainerDiv.className = 'url-container';

        const urlDiv = document.createElement('div');
        urlDiv.className = 'url-item';
        urlDiv.textContent = url;

        const removeButton = document.createElement('i');
        removeButton.className = 'fa-solid fa-xmark-large remove-url';
        removeButton.onclick = function () {
            urlContainerDiv.remove();
            saveUrls();
        };

        urlDiv.appendChild(removeButton);
        urlContainerDiv.appendChild(urlDiv);
        urlContainer.appendChild(urlContainerDiv);
    }

    urlInput.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ',') {
            addUrlsFromInput();
            event.preventDefault();
        }
    });

    // --- Save Correct Answers Setting ---
    const saveAnswersCheckbox = document.getElementById('saveAnswersCheckbox');

    chrome.storage.local.get(['saveCorrectAnswers'], function(result) {
        saveAnswersCheckbox.checked = result.saveCorrectAnswers !== false;
    });

    saveAnswersCheckbox.addEventListener('change', function() {
        const isChecked = saveAnswersCheckbox.checked;
        chrome.storage.local.set({ saveCorrectAnswers: isChecked }, function() {
            console.log('Save Correct Answers setting updated:', isChecked);
        });
    });

    // --- Updates Fetching Logic ---
    const updatesDiv = document.getElementById('updates_content');
    const importantAlertIcon = document.getElementById("important_alert_icon");

    fetch('https://data.canvashack.com/updates.json')
        .then(response => response.json())
        .then(data => {
            let hasImportant = false;
            let latestUpdateDate = null;

            function calculateDaysAgo(dateString) {
                const updateDate = new Date(dateString);
                const currentDate = new Date();
                const timeDifference = currentDate - updateDate;
                return Math.floor(timeDifference / (1000 * 60 * 60 * 24));
            }

            let content = '<div class="announcements-block">';
            data.updates.forEach((update, index) => {
                const daysAgo = calculateDaysAgo(update.date);
                content += `
                    <div class="announcements-box">
                        <h3>${update.date} <span class="days-ago">${daysAgo}d ago</span></h3>
                        <p>${update.title}</p>
                        <ul>
                            ${update.details.map(detail => `<li>${detail}</li>`).join('')}
                        </ul>
                        <p class="author">Blazer @ CanvasHack</p>
                    </div>
                `;
                
                if (update.important && index === 0) {
                    hasImportant = true;
                    latestUpdateDate = update.date;
                }
            });
            content += '</div>';

            updatesDiv.innerHTML = content;

            chrome.storage.local.get(['lastViewedUpdateDate'], function(result) {
                if (hasImportant && result.lastViewedUpdateDate !== latestUpdateDate) {
                    importantAlertIcon.style.display = 'block';
                }
            });

            updatesIcon.addEventListener('click', () => {
                if (hasImportant) {
                    chrome.storage.local.set({ lastViewedUpdateDate: latestUpdateDate });
                    importantAlertIcon.style.display = 'none';
                }
            });
        })
        .catch(error => console.error('Error fetching updates:', error));

    // --- Tutorial Logic ---
    let currentStep = 0;
    const steps = document.querySelectorAll(".step");
    const progressFill = document.querySelector(".progress-fill");

    if (steps.length > 0 && progressFill) { // Check if tutorial elements exist
        progressFill.style.width = "25%";
        steps[currentStep].classList.add("active");
    
        function updateStep() {
            steps.forEach((step, index) => step.classList.toggle("active", index === currentStep));
            
            const progressPercentage = 25 + ((currentStep / (steps.length - 1)) * 75);
            progressFill.style.width = `${progressPercentage}%`;
        }
    
        document.querySelectorAll(".next-btn").forEach((button) => {
            button.addEventListener("click", () => {
                if (currentStep < steps.length - 1) {
                    currentStep++;
                    updateStep();
                } else {
                    document.getElementById("step-container").style.display = "none";
                    localStorage.setItem("tutorialCompleted", "true");
                }
            });
        });
    
        if (!localStorage.getItem("tutorialCompleted")) {
            document.getElementById("step-container").style.display = "flex";
        } else {
            document.getElementById("step-container").style.display = "none";
        }
    }

    const downArrow = document.getElementById('down-arrow');
    const reviewColumn = document.querySelector('.review-column');
    var scrollInterval;

    if (downArrow && reviewColumn) {
        function startScrolling() {
          clearInterval(scrollInterval);
          scrollInterval = setInterval(function() {
            reviewColumn.scrollBy({ top: 10, left: 0, behavior: 'smooth' });
          }, 8);
        }
      
        function stopScrolling() {
          clearInterval(scrollInterval);
        }

        downArrow.addEventListener('click', function() {
            reviewColumn.scrollBy({ top: 140, left: 0, behavior: 'smooth' });
        });
      
        downArrow.addEventListener('mousedown', startScrolling);
        downArrow.addEventListener('mouseup', stopScrolling);
        downArrow.addEventListener('mouseleave', stopScrolling);
        downArrow.addEventListener('touchstart', function(e) {
          e.preventDefault();
          startScrolling();
        });
        downArrow.addEventListener('touchend', stopScrolling);
    }
});