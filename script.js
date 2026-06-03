const fluteProfiles = {
  E: { name: "E-flute", thickness: 1.5 },
  B: { name: "B-flute", thickness: 3.0 },
  C: { name: "C-flute", thickness: 4.0 },
  EB: { name: "EB double wall", thickness: 4.5 },
  BC: { name: "BC double wall", thickness: 7.0 },
  Custom: { name: "Custom", thickness: 3.0 }
};

const boardGrades = {
  "T-21": { recommendedTolerance: 3 },
  "T-22": { recommendedTolerance: 3 },
  "T-23": { recommendedTolerance: 3 },
  "T-24": { recommendedTolerance: 3 },
  "P-31": { recommendedTolerance: 5 },
  "P-32": { recommendedTolerance: 5 },
  Custom: { recommendedTolerance: 3 }
};

const boxTypes = {
  "FEFCO 0201": {
    name: "Классический 4-клапанный гофроящик",
    lengthWalls: 2,
    widthWalls: 2,
    heightWalls: 2
  },
  "FEFCO 0427": {
    name: "Самосборный лоток / showbox",
    lengthWalls: 2,
    widthWalls: 2,
    heightWalls: 1
  },
  "FEFCO 0401": {
    name: "Лоток / tray",
    lengthWalls: 2,
    widthWalls: 2,
    heightWalls: 1
  },
  Custom: {
    name: "Пользовательская конструкция",
    lengthWalls: 2,
    widthWalls: 2,
    heightWalls: 2
  }
};

// Количество стенок по длине/ширине/высоте зависит от конструкции и реальной технологии изготовления,
// поэтому значения должны проверяться по чертежу/развертке поставщика.
const defaults = {
  innerLength: 595,
  innerWidth: 260,
  innerHeight: 150,
  fluteProfile: "B",
  boardGrade: "T-22",
  boxType: "FEFCO 0201",
  tolerance: 3,
  logisticsAllowance: 2,
  palletLength: 1200,
  palletWidth: 800,
  maxPalletHeight: 1800,
  palletHeight: 144,
  calculationMode: "exact",
  palletSizeType: "cape"
};

const fields = {};
const output = {};
let latestResult = null;
let toastTimer = null;

document.addEventListener("DOMContentLoaded", () => {
  cacheElements();
  populateSelects();
  bindEvents();
  resetForm();
});

function cacheElements() {
  [
    "innerLength",
    "innerWidth",
    "innerHeight",
    "fluteProfile",
    "thickness",
    "boardGrade",
    "tolerance",
    "boxType",
    "calculationMode",
    "lengthWalls",
    "widthWalls",
    "heightWalls",
    "logisticsAllowance",
    "palletLength",
    "palletWidth",
    "maxPalletHeight",
    "palletHeight",
    "palletSizeType"
  ].forEach((id) => {
    fields[id] = document.getElementById(id);
  });

  [
    "activeModeLabel",
    "innerResult",
    "outerResult",
    "capeResult",
    "maxResult",
    "safeResult",
    "palletSizeLabel",
    "casesPerLayer",
    "layers",
    "totalCases",
    "bestOrientation",
    "freeSpace",
    "caseSizeUsed",
    "warnings",
    "palletVisual",
    "visualCaption",
    "visualCases",
    "toast"
  ].forEach((id) => {
    output[id] = document.getElementById(id);
  });

  output.resetButton = document.getElementById("resetButton");
  output.copyButton = document.getElementById("copyButton");
  output.exportButton = document.getElementById("exportButton");
}

function populateSelects() {
  Object.entries(fluteProfiles).forEach(([key, profile]) => {
    fields.fluteProfile.add(new Option(`${key} — ${profile.name}`, key));
  });

  Object.keys(boardGrades).forEach((key) => {
    fields.boardGrade.add(new Option(key, key));
  });

  Object.entries(boxTypes).forEach(([key, type]) => {
    fields.boxType.add(new Option(`${key} — ${type.name}`, key));
  });
}

function bindEvents() {
  Object.values(fields).forEach((field) => {
    field.addEventListener("input", calculateAndRender);
    field.addEventListener("change", calculateAndRender);
  });

  fields.fluteProfile.addEventListener("change", () => {
    if (fields.fluteProfile.value !== "Custom") {
      fields.thickness.value = fluteProfiles[fields.fluteProfile.value].thickness;
    }
    calculateAndRender();
  });

  fields.boardGrade.addEventListener("change", () => {
    fields.tolerance.value = boardGrades[fields.boardGrade.value].recommendedTolerance;
    calculateAndRender();
  });

  fields.boxType.addEventListener("change", () => {
    const selectedType = boxTypes[fields.boxType.value];
    fields.lengthWalls.value = selectedType.lengthWalls;
    fields.widthWalls.value = selectedType.widthWalls;
    fields.heightWalls.value = selectedType.heightWalls;
    calculateAndRender();
  });

  output.resetButton.addEventListener("click", resetForm);
  output.copyButton.addEventListener("click", copyResult);
  output.exportButton.addEventListener("click", exportJson);
}

function resetForm() {
  Object.entries(defaults).forEach(([key, value]) => {
    if (fields[key]) {
      fields[key].value = value;
    }
  });

  fields.thickness.value = fluteProfiles[defaults.fluteProfile].thickness;
  const selectedType = boxTypes[defaults.boxType];
  fields.lengthWalls.value = selectedType.lengthWalls;
  fields.widthWalls.value = selectedType.widthWalls;
  fields.heightWalls.value = selectedType.heightWalls;
  calculateAndRender();
}

function calculateAndRender() {
  const input = readInput();
  const dimensions = calculateDimensions(input);
  const pallet = calculatePalletization(input, dimensions);

  latestResult = {
    input,
    dimensions,
    pallet,
    note: "Расчетный наружный размер является инженерной оценкой и требует подтверждения фактическим замером готового ящика."
  };

  renderResults(input, dimensions, pallet);
  renderPalletVisual(input, pallet);
}

function readInput() {
  return {
    innerLength: numericValue("innerLength"),
    innerWidth: numericValue("innerWidth"),
    innerHeight: numericValue("innerHeight"),
    fluteProfile: fields.fluteProfile.value,
    thickness: numericValue("thickness"),
    boardGrade: fields.boardGrade.value,
    boxType: fields.boxType.value,
    lengthWalls: numericValue("lengthWalls"),
    widthWalls: numericValue("widthWalls"),
    heightWalls: numericValue("heightWalls"),
    tolerance: numericValue("tolerance"),
    logisticsAllowance: numericValue("logisticsAllowance"),
    calculationMode: fields.calculationMode.value,
    palletLength: numericValue("palletLength"),
    palletWidth: numericValue("palletWidth"),
    maxPalletHeight: numericValue("maxPalletHeight"),
    palletHeight: numericValue("palletHeight"),
    palletSizeType: fields.palletSizeType.value
  };
}

function numericValue(fieldId) {
  const value = Number.parseFloat(fields[fieldId].value);
  return Number.isFinite(value) ? value : 0;
}

function calculateDimensions(input) {
  // Ориентировочный наружный размер считается от внутренних размеров и толщин стенок.
  const outerLength = input.innerLength + input.thickness * input.lengthWalls;
  const outerWidth = input.innerWidth + input.thickness * input.widthWalls;
  const outerHeight = input.innerHeight + input.thickness * input.heightWalls;

  const capeLength = outerLength + input.logisticsAllowance;
  const capeWidth = outerWidth + input.logisticsAllowance;
  const capeHeight = outerHeight + input.logisticsAllowance;

  const maxLength = outerLength + input.tolerance;
  const maxWidth = outerWidth + input.tolerance;
  const maxHeight = outerHeight + input.tolerance;

  const safeLength = outerLength + input.tolerance + input.logisticsAllowance;
  const safeWidth = outerWidth + input.tolerance + input.logisticsAllowance;
  const safeHeight = outerHeight + input.tolerance + input.logisticsAllowance;

  return {
    inner: { length: input.innerLength, width: input.innerWidth, height: input.innerHeight },
    outer: { length: outerLength, width: outerWidth, height: outerHeight },
    cape: { length: capeLength, width: capeWidth, height: capeHeight },
    max: { length: maxLength, width: maxWidth, height: maxHeight },
    safe: { length: safeLength, width: safeWidth, height: safeHeight }
  };
}

function calculatePalletization(input, dimensions) {
  // Для паллетизации можно выбрать расчетный наружный размер, Cape Pack safe,
  // производственный максимум или максимально безопасный размер.
  const caseSize = dimensions[input.palletSizeType];
  const normal = calculateOrientation(input, caseSize.length, caseSize.width, caseSize.height, false);
  const rotated = calculateOrientation(input, caseSize.width, caseSize.length, caseSize.height, true);
  const best = chooseBestOrientation(normal, rotated);
  const warnings = buildWarnings(input, best, caseSize);

  return {
    caseSize,
    normal,
    rotated,
    best,
    warnings
  };
}

function calculateOrientation(input, caseLength, caseWidth, caseHeight, rotated) {
  const casesAlongLength = caseLength > 0 ? Math.floor(input.palletLength / caseLength) : 0;
  const casesAlongWidth = caseWidth > 0 ? Math.floor(input.palletWidth / caseWidth) : 0;
  const casesPerLayer = casesAlongLength * casesAlongWidth;
  const availableHeight = Math.max(input.maxPalletHeight - input.palletHeight, 0);
  const layers = caseHeight > 0 ? Math.floor(availableHeight / caseHeight) : 0;
  const totalCases = casesPerLayer * layers;
  const freeLength = input.palletLength - casesAlongLength * caseLength;
  const freeWidth = input.palletWidth - casesAlongWidth * caseWidth;

  return {
    rotated,
    caseLength,
    caseWidth,
    caseHeight,
    casesAlongLength,
    casesAlongWidth,
    casesPerLayer,
    layers,
    totalCases,
    freeLength,
    freeWidth
  };
}

function chooseBestOrientation(normal, rotated) {
  if (rotated.casesPerLayer > normal.casesPerLayer) {
    return rotated;
  }

  if (rotated.casesPerLayer === normal.casesPerLayer && rotated.freeLength + rotated.freeWidth > normal.freeLength + normal.freeWidth) {
    return rotated;
  }

  return normal;
}

function buildWarnings(input, best, caseSize) {
  const warnings = [];
  // Тестовый пример B-flute показывает риск схемы 2×3: 268 × 3 = 804 мм по паллете 800 мм.
  const normalThreeWideRisk = Math.abs(caseSize.width * 3 - input.palletWidth) <= 6 && caseSize.width * 3 > input.palletWidth;

  if (caseSize.length > input.palletLength || caseSize.width > input.palletWidth) {
    warnings.push("Есть нависание за пределы паллеты. Для транспортной гофротары это риск деформации, потери прочности штабеля и претензий по логистике.");
  }

  if (best.freeLength < 3 || best.freeWidth < 3) {
    warnings.push("Схема стоит почти в ноль. Рекомендуется проверить фактические наружные размеры готового ящика и допуски производства.");
  }

  if (normalThreeWideRisk) {
    warnings.push(`Проверка Cape Pack: схема 2×3 рискованна по ширине, потому что ${format(caseSize.width)} × 3 = ${format(caseSize.width * 3)} мм при ширине паллеты ${format(input.palletWidth)} мм.`);
  }

  if (best.casesPerLayer === 0 || best.layers === 0) {
    warnings.push("Выбранный размер не формирует полноценный слой или высоту штабеля. Проверьте размер ящика, высоту паллеты и лимит по высоте.");
  }

  return warnings;
}

function renderResults(input, dimensions, pallet) {
  output.activeModeLabel.textContent = modeLabel(input.calculationMode);
  output.innerResult.textContent = sizeText(dimensions.inner);
  output.outerResult.textContent = sizeText(dimensions.outer);
  output.capeResult.textContent = sizeText(dimensions.cape);
  output.maxResult.textContent = sizeText(dimensions.max);
  output.safeResult.textContent = sizeText(dimensions.safe);

  output.palletSizeLabel.textContent = `Паллета ${format(input.palletLength)}×${format(input.palletWidth)}`;
  output.casesPerLayer.textContent = pallet.best.casesPerLayer;
  output.layers.textContent = pallet.best.layers;
  output.totalCases.textContent = pallet.best.totalCases;
  output.bestOrientation.textContent = orientationText(pallet.best);
  output.freeSpace.textContent = `${format(pallet.best.freeLength)} мм по длине / ${format(pallet.best.freeWidth)} мм по ширине`;
  output.caseSizeUsed.textContent = `${sizeText(pallet.caseSize)} (${sizeTypeLabel(input.palletSizeType)})`;

  output.warnings.innerHTML = "";
  pallet.warnings.forEach((warning) => {
    const warningNode = document.createElement("div");
    warningNode.className = "warning";
    warningNode.textContent = warning;
    output.warnings.appendChild(warningNode);
  });
}

function renderPalletVisual(input, pallet) {
  const visual = output.palletVisual;
  const best = pallet.best;
  const scaleX = input.palletLength > 0 ? 100 / input.palletLength : 0;
  const scaleY = input.palletWidth > 0 ? 100 / input.palletWidth : 0;

  visual.innerHTML = "";

  for (let row = 0; row < best.casesAlongWidth; row += 1) {
    for (let column = 0; column < best.casesAlongLength; column += 1) {
      const caseNode = document.createElement("div");
      caseNode.className = "case-box";
      caseNode.style.left = `${column * best.caseLength * scaleX}%`;
      caseNode.style.top = `${row * best.caseWidth * scaleY}%`;
      caseNode.style.width = `${Math.max(best.caseLength * scaleX, 2)}%`;
      caseNode.style.height = `${Math.max(best.caseWidth * scaleY, 2)}%`;
      caseNode.textContent = best.casesPerLayer <= 18 ? `${column + 1},${row + 1}` : "";
      visual.appendChild(caseNode);
    }
  }

  const label = document.createElement("div");
  label.className = "visual-label";
  label.textContent = `case ${format(best.caseLength)}×${format(best.caseWidth)}`;
  visual.appendChild(label);

  output.visualCaption.textContent = `pallet ${format(input.palletLength)}×${format(input.palletWidth)}`;
  output.visualCases.textContent = `cases per layer: ${best.casesPerLayer}`;
}

function copyResult() {
  if (!latestResult) {
    return;
  }

  const text = [
    "Corrugated Box Internal → External Size Calculator",
    `Внутренний размер: ${sizeText(latestResult.dimensions.inner)}`,
    `Расчетный наружный размер: ${sizeText(latestResult.dimensions.outer)}`,
    `Safe size for Cape Pack: ${sizeText(latestResult.dimensions.cape)}`,
    `Производственный максимум: ${sizeText(latestResult.dimensions.max)}`,
    `Максимально безопасный размер: ${sizeText(latestResult.dimensions.safe)}`,
    `Паллетизация: ${latestResult.pallet.best.casesAlongLength}×${latestResult.pallet.best.casesAlongWidth}, слоев ${latestResult.pallet.best.layers}, всего ${latestResult.pallet.best.totalCases}`,
    "Требует подтверждения фактическим замером."
  ].join("\n");

  navigator.clipboard
    .writeText(text)
    .then(() => showToast("Результат скопирован. Можно нести в Cape Pack — осторожно, но уверенно."))
    .catch(() => showToast("Не удалось скопировать автоматически. Разрешите доступ к буферу обмена."));
}

function exportJson() {
  if (!latestResult) {
    return;
  }

  const blob = new Blob([JSON.stringify(latestResult, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "corrugated-box-calculation.json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast("JSON экспортирован.");
}

function format(value) {
  return Number.isFinite(value) ? value.toFixed(1) : "0.0";
}

function sizeText(size) {
  return `${format(size.length)} × ${format(size.width)} × ${format(size.height)} мм`;
}

function modeLabel(mode) {
  return {
    exact: "Точный расчет",
    cape: "Безопасный расчет для Cape Pack",
    max: "Производственный максимум"
  }[mode];
}

function sizeTypeLabel(type) {
  return {
    outer: "наружный расчетный",
    cape: "Cape Pack safe",
    max: "производственный максимум",
    safe: "максимально безопасный"
  }[type];
}

function orientationText(orientation) {
  const prefix = orientation.rotated ? "Повернутая" : "Стандартная";
  return `${prefix}: ${orientation.casesAlongLength}×${orientation.casesAlongWidth} в слое`;
}

function showToast(message) {
  clearTimeout(toastTimer);
  output.toast.textContent = message;
  output.toast.classList.add("is-visible");
  toastTimer = setTimeout(() => {
    output.toast.classList.remove("is-visible");
  }, 2800);
}
