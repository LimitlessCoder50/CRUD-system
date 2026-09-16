const state = { products: [], editingId: null };
const $ = (selector) => document.querySelector(selector);
const money = (value) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(
    value,
  );
const getProductQuantity = (product) =>
  Number(product.quntity ?? product.quantity ?? 0);
const getProductPrice = (product) => Number(product.price ?? 0);

$("#today").textContent = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
}).format(new Date());

async function request(url = "api.php", options = {}) {
  if (window.location.protocol === "file:") {
    throw new Error(
      "Open the project with a PHP local server: php -S localhost:8000 inside the inventory-frontend folder, then open http://localhost:8000/index.html.",
    );
  }

  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const rawText = await response.text();
  let payload = {};

  try {
    payload = rawText ? JSON.parse(rawText) : {};
  } catch (error) {
    throw new Error(
      "The server returned a non-JSON response. Start the PHP API and make sure it is reachable.",
    );
  }

  if (!response.ok)
    throw new Error(payload.error || "The request could not be completed.");
  return payload;
}

function showError(message = "") {
  $("#status").textContent = message;
}
function escapeHtml(value) {
  return String(value).replace(
    /[&<>'"]/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        character
      ],
  );
}

function render() {
  const query = $("#search").value.trim().toLowerCase();
  const category = $("#category-filter").value;
  const visible = state.products.filter(
    (product) =>
      (!query ||
        `${product.name} ${product.category}`.toLowerCase().includes(query)) &&
      (!category || product.category === category),
  );
  $("#total-count").textContent = state.products.length;
  $("#unit-count").textContent = state.products
    .reduce((sum, product) => sum + getProductQuantity(product), 0)
    .toLocaleString();
  $("#value-count").textContent = money(
    state.products.reduce(
      (sum, product) =>
        sum + getProductQuantity(product) * getProductPrice(product),
      0,
    ),
  );
  const categories = [
    ...new Set(state.products.map((product) => product.category)),
  ].sort();
  $("#category-filter").innerHTML =
    '<option value="">All categories</option>' +
    categories
      .map(
        (item) =>
          `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`,
      )
      .join("");
  $("#category-filter").value = category;
  $("#product-view").innerHTML = visible.length
    ? `<div class="table-wrap"><table><thead><tr><th>Product</th><th>Category</th><th>Quantity</th><th>Price</th><th>Updated</th><th>Actions</th></tr></thead><tbody>${visible.map((product) => `<tr><td class="product-name">${escapeHtml(product.name)}</td><td><span class="category">${escapeHtml(product.category)}</span></td><td>${getProductQuantity(product).toLocaleString()}</td><td class="price">${money(getProductPrice(product))}</td><td>${new Date(product.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td><td><div class="actions"><button class="icon-button" data-edit="${product.id}">Edit</button><button class="icon-button" data-delete="${product.id}">Delete</button></div></td></tr>`).join("")}</tbody></table></div>`
    : `<div class="empty"><strong>${state.products.length ? "No matching products" : "Your inventory is empty"}</strong><p>${state.products.length ? "Try a different search or category." : "Add a product to start tracking your stock."}</p>${state.products.length ? "" : '<button class="button" id="empty-add">+ Add first product</button>'}</div>`;
}

async function loadProducts() {
  try {
    state.products = await request("api.php");
    render();
  } catch (error) {
    showError(error.message);
  }
}
function openForm(product) {
  state.editingId = product?.id || null;
  $("#form-title").textContent = state.editingId
    ? "Edit product"
    : "Add product";
  $("#product-form").reset();
  if (product) {
    const productQuantity = getProductQuantity(product);
    Object.entries(product).forEach(([key, value]) => {
      const field = $("#product-form").elements[key];
      if (field)
        field.value =
          key === "quntity" || key === "quantity" ? productQuantity : value;
    });
  }
  $("#modal").hidden = false;
  $("#product-form").elements.name.focus();
}
function closeForm() {
  $("#modal").hidden = true;
  state.editingId = null;
}

$("#add-product").addEventListener("click", () => openForm());
$("#cancel-form").addEventListener("click", closeForm);
$("#modal").addEventListener("click", (event) => {
  if (event.target.id === "modal") closeForm();
});
$("#product-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  showError("");
  const data = Object.fromEntries(new FormData(event.target));
  const quantityValue = Number(data.quantity);

  try {
    await request(
      state.editingId ? `api.php?id=${state.editingId}` : "api.php",
      {
        method: state.editingId ? "PUT" : "POST",
        body: JSON.stringify({
          ...data,
          quantity: quantityValue,
          quntity: quantityValue,
          price: Number(data.price),
        }),
      },
    );
    closeForm();
    await loadProducts();
  } catch (error) {
    showError(error.message);
  }
});
document.addEventListener("click", async (event) => {
  const editId = event.target.dataset.edit;
  const deleteId = event.target.dataset.delete;
  if (editId)
    openForm(
      state.products.find((product) => Number(product.id) === Number(editId)),
    );
  if (deleteId && confirm("Delete this product?")) {
    try {
      await request(`api.php?id=${deleteId}`, { method: "DELETE" });
      await loadProducts();
    } catch (error) {
      showError(error.message);
    }
  }
  if (event.target.id === "empty-add") openForm();
});
$("#search").addEventListener("input", render);
$("#category-filter").addEventListener("change", render);
loadProducts();
