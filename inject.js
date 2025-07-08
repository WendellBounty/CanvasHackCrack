const overrideVisibilityProperties = () => {
    const properties = {
        visibilityState: 'visible',
        hidden: false,
        webkitVisibilityState: 'visible',
        webkitHidden: false
    };
    Object.keys(properties).forEach(prop => {
        Object.defineProperty(document, prop, { value: properties[prop], writable: true });
    });
};

// overrides focus state to always show the tab has focus
Document.prototype.hasFocus = () => true;

// all the events to block
const eventsToBlock = [
    'focus', 'blur', 'visibilitychange', 'webkitvisibilitychange', 
    'pagehide', 'pageshow'
];

// overrides event listeners to block the events
const overrideEventListeners = (target) => {
    const originalAddEventListener = target.prototype.addEventListener;
    target.prototype.addEventListener = (type, listener, options) => {
        if (eventsToBlock.includes(type)) {
            console.log(`[Canvas Hack] '${type}' event listener subscription prevented.`);
        } else {
            originalAddEventListener.call(this, type, listener, options);
        }
    };

    const originalRemoveEventListener = target.prototype.removeEventListener;
    target.prototype.removeEventListener = (type, listener, options) => {
        if (eventsToBlock.includes(type)) {
            console.log(`[Canvas Hack] '${type}' event listener removal prevented.`);
        } else {
            originalRemoveEventListener.call(this, type, listener, options);
        }
    };
};

// rewrite requests so that the user can leave the Canvas tab
let realEventListener = Window.prototype.addEventListener;
Window.prototype.addEventListener = (a, b, c) => {
    if (a === 'focus' || a === 'blur' || a === 'visibilitychange') {
        console.log(`[AD] '${a}' event listener subscription prevented. (Canvas Hack)`);
    } else {
        realEventListener(a, b, c);
    }
};

overrideVisibilityProperties();
overrideEventListeners(Window);
overrideEventListeners(Document);

// Protects against AI Trojan Horse hack

(function() {
    function removeOrHideElements() {
        const targetElement = document.querySelector('#content-wrapper .description.user_content.enhanced[data-resource-type="assignment.body"]');
        if (targetElement) {
            const spans = targetElement.querySelectorAll('span[aria-hidden="true"]');
            spans.forEach(span => {
                try {
                    span.remove();
                } catch (e) {
                    span.style.display = 'none';
                }
            });
            console.log("AI Trojan Horse Hack Protected & Prevented");
        } else {
            console.log("Target element not found");
        }
    }

    function initObserver() {
        const observer = new MutationObserver(removeOrHideElements);
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    function checkMetaAndInitialize() {
        const metaElement = document.querySelector('meta[name="apple-itunes-app"][content="app-id=480883488"]');
        if (metaElement) {
            console.log("Meta tag found, initializing observer and removing elements");
            initObserver();
            removeOrHideElements();
        } else {
            console.log("Meta tag not found, script will not run");
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkMetaAndInitialize);
    } else {
        checkMetaAndInitialize();
    }
})();