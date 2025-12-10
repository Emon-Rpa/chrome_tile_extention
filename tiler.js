chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === "split") {
        splitTabs(msg.cols, msg.rows);
    }
});

async function splitTabs(cols, rows) {
    const tabs = await chrome.tabs.query({ currentWindow: true });

    const needed = Math.min(tabs.length, cols * rows);

    // get screen size
    const displays = await chrome.system.display.getInfo();
    const screen = displays[0].workArea;

    const tileW = Math.floor(screen.width / cols);
    const tileH = Math.floor(screen.height / rows);

    // create windows for each tab
    for (let i = 0; i < needed; i++) {

        const left = (i % cols) * tileW;
        const top = Math.floor(i / cols) * tileH;

        // create a new window for this tab
        const win = await chrome.windows.create({
            tabId: tabs[i].id,
            left,
            top,
            width: tileW,
            height: tileH,
            focused: false
        });
    }
}
