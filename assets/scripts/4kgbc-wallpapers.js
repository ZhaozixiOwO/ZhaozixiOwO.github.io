const imagesPerPage = 10;
const gallery = document.getElementById("wallpaper-gallery");
const pagination = document.getElementById("pagination");

const imageBasePath = "/assets/images/";

let groups = [];
let totalImageCount = 0;

fetch("/assets/images/4kgbc-wallpapers.json")
  .then(res => {
    if (!res.ok) {
      throw new Error(`JSON 加载失败：${res.status}`);
    }
    return res.json();
  })
  .then(data => {
    groups = Array.isArray(data.groups) ? data.groups : [];
    totalImageCount = data.totalImageCount || 0;
    renderPage(1);
  })
  .catch(error => {
    console.error(error);
    gallery.innerHTML = `<p class="resolution-text">图片列表加载失败，请检查 4kgbc-wallpapers.json。</p>`;
  });

function removeExtension(filename) {
  return filename.replace(/\.[^/.]+$/, "");
}

function getDisplayName(filename) {
  return removeExtension(filename)
    // 兼容新的命名：4kgbc-1-web.webp -> 4kgbc-1
    .replace(/-(web|preview|compressed|optimized)$/i, "");
}

function normalizeImageItem(item) {
  if (!item) return null;

  // 当前 Python 脚本输出的是字符串，例如：4kgbc-1-web.webp
  if (typeof item === "string") {
    return {
      file: item,
      src: `${imageBasePath}${item}`,
      title: getDisplayName(item)
    };
  }

  // 兼容未来如果你想在 JSON 里写对象
  if (typeof item === "object") {
    const file = item.file || item.filename || item.image || item.src;
    if (!file) return null;

    const src = file.startsWith("/") ? file : `${imageBasePath}${file}`;

    return {
      file,
      src,
      title: item.title || getDisplayName(file)
    };
  }

  return null;
}

async function renderPage(page) {
  gallery.innerHTML = "";

  const group = groups.find(g => g.groupNumber === page);
  if (!group) return;

  for (const item of group.images) {
    const image = normalizeImageItem(item);
    if (!image) continue; // 跳过补齐的 null

    const container = document.createElement("div");
    container.className = "image-container";

    const img = new Image();
    img.src = image.src;
    img.alt = image.title;
    img.loading = "lazy";
    img.className = "thumbnail";
    img.style.cursor = "pointer";

    const info = document.createElement("div");
    info.className = "image-info";

    const title = document.createElement("div");
    title.className = "image-title";
    title.textContent = image.title;

    const resolution = document.createElement("div");
    resolution.className = "resolution-text";
    resolution.textContent = "加载中...";

    img.onload = () => {
      resolution.textContent = `${img.naturalWidth} × ${img.naturalHeight}`;
    };

    img.onerror = () => {
      resolution.textContent = "图片加载失败";
      console.error(`图片加载失败：${image.src}`);
    };

    // 点击打开当前 JSON 指向的压缩图。
    // 这些 -web.webp 是同分辨率压缩版，所以仍然是完整分辨率预览。
    img.onclick = () => {
      window.open(image.src, "_blank");
    };

    info.appendChild(title);
    info.appendChild(resolution);

    container.appendChild(img);
    container.appendChild(info);
    gallery.appendChild(container);
  }

  renderPagination(page);
}

function renderPagination(currentPage) {
  pagination.innerHTML = "";
  const totalPages = groups.length;

  const prev = document.createElement("button");
  prev.textContent = "Previous";
  prev.disabled = currentPage === 1;
  prev.onclick = () => renderPage(currentPage - 1);
  pagination.appendChild(prev);

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    if (i === currentPage) btn.classList.add("active");
    btn.onclick = () => renderPage(i);
    pagination.appendChild(btn);
  }

  const next = document.createElement("button");
  next.textContent = "Next";
  next.disabled = currentPage === totalPages;
  next.onclick = () => renderPage(currentPage + 1);
  pagination.appendChild(next);
}
