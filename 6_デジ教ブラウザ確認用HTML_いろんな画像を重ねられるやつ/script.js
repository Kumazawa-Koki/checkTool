let images = [];//　画像情報を格納する配列
let zoomLevel = 100;//　ズームスライダーで調整する拡大率

// HTMLのオブジェクトの取得
// グローバル変数による取得のため、色々な関数内で使用可能
const dropArea = document.getElementById("drop-area");
const layerMenu = document.getElementById("layer-menu");
const zoomSlider = document.getElementById('zoom-slider');
const zoomValue = document.getElementById('zoom-value');
const resetButton = document.querySelector('.reset');
const dragToggleButton = document.getElementById('toggle-drag');
const selectAllButton = document.getElementById('select-all-button');
const opacityButton = document.querySelector('#opacity-controls button');
const dragCheckText = document.getElementById('dragCheck');


// ドラッグ機能の切り替え（ドラッグ切替ボタン）
let isDragEnabled = true;
dragToggleButton.addEventListener('click', () => {
    isDragEnabled = !isDragEnabled;
    toggleImageDrag();
    toggleLayerDrag();
    dragToggleButton.style.backgroundColor = isDragEnabled ? "#B2D3A5" : "#8BB174";
    dragCheckText.textContent = isDragEnabled ? "ドラッグ機能ON" : "ドラッグ機能OFF";
    dragCheckText.style.backgroundColor = isDragEnabled ? "#B2D3A5" : "#8BB174";
});

// 画像がドラッグできるかの切替
function toggleImageDrag() {
    const imgEls = dropArea.querySelectorAll('img');
    imgEls.forEach(img => {
        img.setAttribute('draggable', isDragEnabled ? 'true' : 'false');
    });
}

// レイヤーメニューのドラッグ切り替え
function toggleLayerDrag() {
    const layerEls = layerMenu.querySelectorAll('.layer-item');
    layerEls.forEach(layerEl => {
        layerEl.setAttribute('draggable', isDragEnabled ? 'true' : 'false');

        // レイヤーメニューがドラッグ可能か不可能かでUIの色を変更している
        if (!isDragEnabled) {
            layerEl.style.backgroundColor = layerEl.getAttribute("data-selected") === "true" ? "#8BB174" : "#999";
        } else {
            layerEl.style.backgroundColor = layerEl.getAttribute("data-selected") === "true" ? "#B2D3A5" : "#ccc";
        }
    });
}

// ズームスライダーのイベント
// スライダーの入力が変化した時にzoomLevelを更新
zoomSlider.addEventListener('input', (e) => {
    zoomLevel = parseInt(e.target.value);
    zoomValue.textContent = `${zoomLevel}%`;
    updateZoom();
});

// ズーム処理本体
function updateZoom() {
    const scrollLeft = dropArea.scrollLeft;
    const scrollTop = dropArea.scrollTop;
    const imgEls = document.querySelectorAll('#drop-area img');
    const dropAreaRect = dropArea.getBoundingClientRect(); // dropAreaの大きさを取得

    let needsScrollX = false;
    let needsScrollY = false;

    imgEls.forEach(img => {
        img.style.transform = `scale(${zoomLevel / 100})`; // ズームレベルに基づいて画像を拡大
        img.style.transformOrigin = 'top left'; // 拡大基準を左上に設定

        const imgRect = img.getBoundingClientRect();

        // 画像がdropAreaの幅を超えていたらスクロールXが必要
        if (imgRect.width > dropAreaRect.width) {
            needsScrollX = true;
        }

        // 画像がdropAreaの高さを超えていたらスクロールYが必要
        if (imgRect.height > dropAreaRect.height) {
            needsScrollY = true;
        }
    });

    // dropAreaのスクロール設定
    dropArea.style.overflowX = needsScrollX ? "auto" : "hidden";
    dropArea.style.overflowY = needsScrollY ? "auto" : "hidden";

    requestAnimationFrame(() => {
        dropArea.scrollLeft = scrollLeft;
        dropArea.scrollTop = scrollTop;
    })
}

// 画像のドロップ処理
dropArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropArea.style.background = "#eee";
});

dropArea.addEventListener("dragleave", () => {
    dropArea.style.background = "#cdd";
});

dropArea.addEventListener("drop", (e) => {
    e.preventDefault();
    dropArea.style.background = "#cdd";

    const files = [...e.dataTransfer.files];
    files.forEach(file => {
        const fileType = file.type.split('/')[1];// ドロップ時に画像ファイルを読み込みBase64に変換して配列に保存
        if (!['png', 'svg+xml', 'webp', 'jpeg'].includes(fileType)) {
            alert("対応していない形式のファイルです。png、svg、webp、jpg形式の画像のみがサポートされています。");
            return;
        }
        // 読み込んだ画像情報
        const imgURL = URL.createObjectURL(file);
        const imgId = file.name.replace(/\.[^/.]+$/, "");
        images.push({
            id: imgId,
            url: imgURL,
            visible: true,
            isAltColor: false,
            opacity: 1,
            altColor: "#ddd"
        });
    });
    // 画像を表示
    renderImages();
    renderLayers();
});

let selectedImage = null;

// 初期状態ではボタン等のUI入力は受け付けない
function updateButtonState() {
    const hasImages = document.querySelectorAll('#drop-area img').length > 0;
    const hasLayers = document.querySelectorAll('.layer-item').length > 0;
    const isActive = hasImages || hasLayers;

    zoomSlider.disabled = !isActive;
    resetButton.disabled = !isActive;
    dragToggleButton.disabled = !isActive;
    selectAllButton.disabled = !isActive;
    opacityButton.disabled = !isActive;
}

const opacityMap = {};

// 画像表示（描画）関数
function renderImages() {
    const scrollLeft = dropArea.scrollLeft;
    const scrollTop = dropArea.scrollTop;

    dropArea.innerHTML = "";// ドロップエリアを空にして全画像を一から描画し直す
    dropArea.style.position = "relative";

    images.forEach(img => {
        const imgEl = document.createElement("img");
        imgEl.src = img.url;
        imgEl.dataset.id = img.id;
        imgEl.style.maxWidth = "95%";
        imgEl.style.maxHeight = "95%";
        imgEl.style.objectFit = "contain";
        imgEl.style.position = "absolute";
        imgEl.style.top = "0";
        imgEl.style.left = "0";
        imgEl.style.right = "0";
        imgEl.style.bottom = "0";
        imgEl.style.margin = "auto";
        imgEl.style.opacity = img.opacity ?? 1;

        // 表示・非表示の切り替え
        imgEl.style.display = img.visible ? "block" : "none";
        imgEl.setAttribute("draggable", "false");

        let dragstartX, dragstartY;

        imgEl.addEventListener("pointerdown", ((e) => {
            dragstartX = e.clientX;
            dragstartY = e.clientY;
        }));

        imgEl.addEventListener("pointerup", (e) => {
            const dx = Math.abs(e.clientX - dragstartX);
            const dy = Math.abs(e.clientY - dragstartY);

            if (dx < 5 && dy < 5) {
                let newOpacity = imgEl.style.opacity === "0.4" ? "1" : "0.4";
                imgEl.style.opacity = newOpacity;

                // 透明度を記録
                img.opacity = parseFloat(newOpacity);
            }
        });
        dropArea.appendChild(imgEl);
    });
    // ズームの状態を反映
    updateButtonState();
    updateZoom();

    requestAnimationFrame(() => {
        dropArea.scrollLeft = scrollLeft;
        dropArea.scrollTop = scrollTop;
    });
}

let isOpacityChanging = false; // opacityButtonのクリックでONOFFが切り替わる
let initialOpacity = {};

// ページのDOM（Document Object Model）が完全に読み込まれた時に実行されるコード
document.addEventListener("DOMContentLoaded", () => {
    const opacityButton = document.querySelector("#opacity-controls button");
    const buttonsToDisable = document.querySelectorAll(".reset, #toggle-drag, #select-all-button");
    const dropOverlay = document.getElementById("drop-overlay");
    const layerItems = document.querySelectorAll('.layer-item');

    // dropareaで「ドロップ」イベントが発生した時に実行される
    dropArea.addEventListener("drop", (event) => {
        event.preventDefault();
        document.querySelectorAll('.opacity-item').forEach(item => {
            item.addEventListener('click', function () {
                let imgId = this.dataset.id;
                let img = document.querySelector(`img[data-id="${imgId}"]`);

                if (img) {
                    const currentOpacity = img.style.opacity === "0.4" ? "1" : "0.4";
                    img.style.opacity = currentOpacity;
                    opacityMap[imgId] = currentOpacity;
                }
            });
        });
    });

    // 不透明度トグルボタン
    opacityButton.addEventListener("click", () => {
        isOpacityChanging = !isOpacityChanging;

        // opacity-itemが表示・非表示される 
        document.querySelectorAll('.opacity-item').forEach(opacityItem => {
            const currentColor = opacityItem.style.backgroundColor;
            if (opacityItem.style.display === 'none') {
                opacityMap[opacityItem.dataset.id] = currentColor;
            }
            opacityItem.style.display = opacityItem.style.display === 'none' ? 'flex' : 'none';
            if (opacityItem.style.display === 'flex') {
                opacityItem.style.backgroundColor = opacityMap[opacityItem.dataset.id] || currentColor;
            }

            layerItems.forEach(layerItem => {
                if (opacityItem.style.display === 'flex') {
                    layerItem.draggable = false; // opacityItemが表示されたらドラッグ無効化
                } else {
                    layerItem.draggable = true; // opacityItemが非表示ならドラッグ有効化
                }
            });
        });

        // 不透明度変更中にテキストや背景色の変更を行う
        if (isOpacityChanging) {
            dragToggleButton.style.backgroundColor = "#8BB174";
            dragCheckText.textContent = "不透明度変更中";
            dragCheckText.style.backgroundColor = "#4f6ba8";
            dragCheckText.style.color = "#fff";
        } else {
            dragCheckText.textContent = isDragEnabled ? "ドラッグ機能ON" : "ドラッグ機能OFF";
            dragCheckText.style.backgroundColor = isDragEnabled ? "#B2D3A5" : "#8BB174";
            dragCheckText.style.color = "#000";
        }

        // 不透明度変更中にdropOverlay（画像を表示するところにかぶせるアミ）を表示。
        // 他のボタンを無効化する
        if (isOpacityChanging) {
            if (isDragEnabled) {
                isDragEnabled = false;
                toggleImageDrag();
                toggleLayerDrag();
            }

            buttonsToDisable.forEach(button => {
                button.disabled = true;// 他のボタンを無効にする
            });

            dropOverlay.style.display = "block";// drop-areaの上のオーバーレイを表示
        } else {
            buttonsToDisable.forEach(button => {
                button.disabled = false;
            });

            dropOverlay.style.display = "none";
        }
    });

    const resetPopup = document.querySelector('.resettip');
    const dragTogglePopup = document.querySelector('.dragtip');
    const selectAllPopup = document.querySelector('.allSelecttip');
    const opacityPopup = document.querySelector('.opacitytip');

    resetButton.addEventListener('mouseover', () => {
        resetPopup.style.display = 'block';
    });

    resetButton.addEventListener('mouseleave', () => {
        resetPopup.style.display = 'none';
    });

    dragToggleButton.addEventListener('mouseover', () => {
        dragTogglePopup.style.display = 'block';
    });

    dragToggleButton.addEventListener('mouseleave', () => {
        dragTogglePopup.style.display = 'none';
    });

    selectAllButton.addEventListener('mouseover', () => {
        selectAllPopup.style.display = 'block';
    });

    selectAllButton.addEventListener('mouseleave', () => {
        selectAllPopup.style.display = 'none';
    });

    opacityButton.addEventListener('mouseover', () => {
        opacityPopup.style.display = 'block';
    });

    opacityButton.addEventListener('mouseleave', () => {
        opacityPopup.style.display = 'none';
    });
});

//レイヤーメニュー表示（描画）関数
function renderLayers() {
    layerMenu.innerHTML = "";// 画像ごとに「レイヤーアイテム」を生成

    images.forEach((img, index) => {
        // ボタンの生成（緑と灰色を切り替え）
        const layerEl = document.createElement("div");
        layerEl.classList.add("layer-item");
        layerEl.setAttribute("data-id", img.id);
        layerEl.setAttribute("data-selected", img.visible ? "true" : "false"); // その画像が表示されているか
        layerEl.style.backgroundColor = img.visible ? "#B2D3A5" : "#ccc";
        layerEl.style.position = "relative";

        const label = document.createElement("span");
        label.textContent = img.id; // レイヤーの表示名として画像IDを表示

        layerEl.appendChild(label);

        // 不透明度レイヤーの生成
        const opacityItem = document.createElement("div");
        opacityItem.classList.add("opacity-item");
        opacityItem.dataset.id = img.id;
        opacityItem.style.opacity = "0.3";
        opacityItem.style.position = "absolute";
        opacityItem.style.top = "0";
        opacityItem.style.left = "0";
        opacityItem.style.width = "100%";
        opacityItem.style.height = "100%";
        opacityItem.style.backgroundColor = "#333";
        opacityItem.style.zIndex = "10";
        opacityItem.style.display = "none";
        opacityItem.style.alignItems = "center";
        opacityItem.style.justifyContent = "center";
        opacityItem.style.cursor = "pointer";

        opacityItem.style.backgroundColor = img.altColor || "#ddd";

        // CSSクラスで色を切り替え
        opacityItem.classList.remove("alt-color");
        updateOpacityColor(opacityItem);

        layerEl.appendChild(opacityItem);

        opacityItem.addEventListener("click", () => {
            opacityItem.classList.toggle("alt-color");

            if (opacityItem.classList.contains("alt-color")) {
                opacityItem.style.backgroundColor = "#0000ff";
            } else {
                opacityItem.style.backgroundColor = "#ddd";
            }

            const isNowActive = !opacityItem.classList.contains("alt-color");

            img.opacity = isNowActive ? 0.4 : 1;

            const currentColor = window.getComputedStyle(opacityItem).backgroundColor;
            const imgEl = document.querySelector(`img[data-id="${img.id}"]`);
            if (imgEl) {
                if (currentColor === "rgb(51,102,255)" || currentColor === "rgb(0,0,255)") {
                    img.opacity = 0.4;
                } else {
                    img.opacity = 1;
                }

                imgEl.style.opacity = img.opacity;
            }
            updateOpacityColor(opacityItem);
        });

        // 透明度変更中の時はレイヤーアイテムの入力を無効化
        layerEl.addEventListener("click", () => {
            if (isOpacityChanging) return;

            const isSelected = layerEl.getAttribute("data-selected") === "true";
            layerEl.setAttribute("data-selected", isSelected ? "false" : "true");
            layerEl.style.backgroundColor = isSelected ? (isDragEnabled ? "#ccc" : "#999") : (isDragEnabled ? "#B2D3A5" : "#8BB174");

            const targetId = layerEl.getAttribute("data-id");
            const targetImg = images.find(img => img.id === targetId);

            if (targetImg) {
                targetImg.visible = !isSelected;
                renderImages();
            }

            // images[index].visible = !isSelected; // このコードが画像とlayer-itemの整合性をずらしてたっぽい（詳しく原因を見てみる）
            renderImages();
        });

        let originalColor = "";
        layerEl.draggable = true;

        // ドラッグ開始
        layerEl.addEventListener("dragstart", (e) => {
            if (opacityItem.style.display === 'flex') {
                e.preventDefault();  // opacityItemが表示されている場合はドラッグを無効化
            } else {
                e.dataTransfer.setData("text/plain", index.toString());
                e.dataTransfer.effectAllowed = "move";
                layerEl.classList.add("dragging");
                opacityItem.classList.add("dragging-opacity");
                originalColor = layerEl.style.backgroundColor;
                layerEl.style.transform = "scale(1.05)";
                layerEl.style.backgroundColor = "#e0a49b";

                opacityItem.style.left = "0";
                opacityItem.style.top = "0";

                opacityItem.style.backgroundColor = img.altColor;
            }
        });

        layerEl.addEventListener("drgover", (e) => {
            e.preventDefault();
            const dragging = document.querySelector(".dragging");
            if (dragging && dragging !== layerEl) {
                layerMenu.insertBefore(dragging, layerEl);
            }
        });

        // ドラッグ終了
        layerEl.addEventListener("dragend", () => {
            const wasAltColor = opacityItem.classList.contains("alt-color");

            layerEl.classList.remove("dragging");
            opacityItem.classList.remove("dragging-opacity");
            layerEl.style.transform = "scale(1)";
            layerEl.style.backgroundColor = originalColor;
            opacityItem.style.backgroundColor = img.altColor || "#ddd";

            img.opacity = wasAltColor ? 0.4 : 1;

            updateImageOrder(); // 画像の順番を更新する関数
            renderImages();

            const newOpacityItem = document.querySelector(`.opacity-item[data-id="${img.id}"]`);
            if (wasAltColor) {
                newOpacityItem.classList.add("alt-color");
            } else {
                newOpacityItem.classList.remove("alt-color");
            }

            const imgEl = document.querySelector(`img[data-id="${img.id}"]`);
            if (imgEl) {
                imgEl.style.opacity = wasAltColor ? 0.4 : 1;
            }

            updateOpacityColor(opacityItem);
        });
        layerMenu.appendChild(layerEl);
    });

    updateButtonState();
}

// alt-color の状態を反映する関数（色設定）
function updateOpacityColor(opacityItem) {
    if (opacityItem.classList.contains("alt-color")) {
        opacityItem.style.backgroundColor = "#0000ff"; // 青
    } else {
        opacityItem.style.backgroundColor = "#333"; // 灰色
    }
}

const opacityItems = document.querySelectorAll('.opacity-item');

function saveInitialOpacity() {
    opacityItems.forEach(item => {
        initialOpacity[item.id] = item.style.backgroundColor || 'initial';
    });
}

// すべて表示ボタン
selectAllButton.addEventListener('click', () => {
    const layerEls = layerMenu.querySelectorAll(".layer-item");
    const allSelected = [...layerEls].every(el => el.getAttribute("data-selected") === "true");

    if (Object.keys(initialOpacity).length === 0) {
        saveInitialOpacity();
    }
    layerEls.forEach((layerEl, index) => {
        const newState = !allSelected;
        layerEl.setAttribute("data-selected", newState ? "true" : "false");
        layerEl.style.backgroundColor = newState ? (isDragEnabled ? "#B2D3A5" : "#8BB174") : "#ccc";
        images[index].visible = newState;

        const opacityItem = layerEl.querySelector(".opacity-item");
        if (newState) {
            opacityItem.style.backgroundColor = initialOpacity[opacityItem.id] || "#333";
        } else {
            opacityItem.style.backgroundColor = initialOpacity[opacityItem.id] || "#4f6ba8";
        }
    });
    renderImages();
    // renderLayers();
    toggleImageDrag();
    toggleLayerDrag();
});

layerMenu.addEventListener("dragover", (e) => {
    e.preventDefault();
    const dragging = document.querySelector(".dragging");
    const afterElement = getDragAfterElement(layerMenu, e.clientY);
    if (afterElement == null) {
        layerMenu.appendChild(dragging);
    } else {
        layerMenu.insertBefore(dragging, afterElement);
    }
});

// ドラッグしている要素をどの位置に持っていくかを計算する関数
function getDragAfterElement(container, y) {
    // 今ドラッグ中じゃない「.layer-item」を全部取得
    const elements = [...container.querySelectorAll(".layer-item:not(.dragging)")];
    return elements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();

        // マウスのY座標と、各要素の中心との距離を計算（offset = マウスの位置 - layer-item要素の中央位置）
        const offset = y - box.top - box.height / 2;
        return offset < 0 && offset > closest.offset ? { offset, element: child } : closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// 画像順の更新
function updateImageOrder() {
    const newOrder = [...layerMenu.querySelectorAll(".layer-item")].map(el => el.getAttribute("data-id"));
    // images.sort((a, b) => newOrder.indexOf(a.id) - newOrder.indexOf(b.id));
    images.sort((a, b) => newOrder.indexOf(String(a.id)) - newOrder.indexOf(String(b.id)));
    renderImages();
}

// 全ての画像データを消して、表示もリセット
resetButton.addEventListener('click', (event) => {
    images = [];
    layerMenu.innerHTML = [];
    dropArea.innerHTML = [];

    dropArea.innerHTML = '<p>ここに画像をドラッグ＆ドロップ（png、svg、webp、jpgのみ対応）</p>';

    updateButtonState();

    const layerEls = layerMenu.querySelectorAll(".layer-item");
    layerEls.forEach(layerEl => {
        layerEl.draggable = true;
    });

    isDragEnabled = true;
    dragToggleButton.style.backgroundColor = "#B2D3A5";
});

updateButtonState();