// グローバル変数
let convertedCSV = "";
let originalFileName = "";

// DOM要素の取得
const fileInput = document.getElementById("fileInput");
const status = document.getElementById("status");
const preview = document.getElementById("preview");
const previewContent = document.getElementById("previewContent");
const downloadBtn = document.getElementById("downloadBtn");
const fileInfo = document.getElementById("fileInfo");
const errorDetails = document.getElementById("errorDetails");


const fileSelect = document.getElementById("fileSelect");
const fileElem = document.getElementById("fileInput");


fileSelect.addEventListener("click", (e) => {
  if (fileElem) {
    fileElem.click();
    handleFileSelect(e);
  }


}, false);

// ファイル選択処理
function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file) {
    processFile(file);
  }
}

// ファイル処理
function processFile(file) {
  // 初期化
  hideError();
  preview.style.display = "none";
  downloadBtn.disabled = true;
  convertedCSV = "";

  originalFileName = file.name.replace(".txt", "");

  // ファイル情報表示
  showFileInfo(file);
  showStatus("ファイルを読み込み中...");

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const content = e.target.result;
      console.log("ファイル内容:", content);

      convertedCSV = convertTxtToCSV(content);

      if (convertedCSV) {
        showStatus("変換が完了しました！");
        showPreview(convertedCSV);
        downloadBtn.disabled = false;
      } else {
        throw new Error("変換結果が空です");
      }
    } catch (error) {
      showError("変換エラー", error);
      console.error("Conversion error:", error);
    }
  };

  reader.onerror = function () {
    showError(
      "ファイル読み込みエラー",
      new Error("ファイルの読み込みに失敗しました")
    );
  };

  reader.readAsText(file);
}

// TXTをCSVに変換
function convertTxtToCSV(txtContent) {
  console.log("変換開始");

  const lines = txtContent.trim().split("\n");
  const csvLines = [];
  const errors = [];

  // ヘッダー行を追加
  csvLines.push("frequency,Gain,phase");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // 空行やヘッダー行をスキップ
    if (!line || line.startsWith("Freq.") || line.includes("V(n019)")) {
      console.log(`行 ${i + 1} をスキップ: ${line}`);
      continue;
    }

    try {
      // タブまたはスペースで分割
      const parts = line.split(/\s+/);
      console.log(`行 ${i + 1} の分割結果:`, parts);

      if (parts.length < 2) {
        errors.push(`行 ${i + 1}: データが不足しています - "${line}"`);
        continue;
      }

      const frequency = parseFloat(parts[0]);
      const complexValue = parts[1];

      if (isNaN(frequency)) {
        errors.push(`行 ${i + 1}: 周波数が無効です - "${parts[0]}"`);
        continue;
      }

      // 複素数形式 (値dB,角度°) をパース
      // 度記号の様々な表現に対応（°、�、度など）
      const match = complexValue.match(/\(([^d]+)dB,([^°�度)]+)[°�度)]?\)/);

      if (!match) {
        errors.push(`行 ${i + 1}: 複素数形式が無効です - "${complexValue}"`);
        console.log(`デバッグ - 複素数値の詳細:`, {
          original: complexValue,
          charCodes: Array.from(complexValue).map(
            (c) => `${c}(${c.charCodeAt(0)})`
          ),
          length: complexValue.length
        });
        continue;
      }

      const rawGainStr = match[1].trim();
      const rawPhaseStr = match[2].trim();

      // 数値部分を抽出（dBや度記号を除去）
      const cleanGainStr = rawGainStr.replace(/[^\d\.\-\+eE]/g, "");
      const cleanPhaseStr = rawPhaseStr.replace(/[^\d\.\-\+eE]/g, "");

      const gain = parseFloat(cleanGainStr);
      const phase = parseFloat(cleanPhaseStr);

      if (isNaN(gain) || isNaN(phase)) {
        errors.push(
          `行 ${
            i + 1
          }: 数値変換エラー - 元: "${rawGainStr}", "${rawPhaseStr}" → 変換後: "${cleanGainStr}", "${cleanPhaseStr}" → 数値: ${gain}, ${phase}`
        );
        continue;
      }

      // 科学記法で出力
      const freqStr = frequency
        .toExponential(2)
        .toUpperCase()
        .replace("E+0", "E+")
        .replace("E-0", "E-");
      const gainStr = gain
        .toExponential(2)
        .toUpperCase()
        .replace("E+0", "E+")
        .replace("E-0", "E-");
      const phaseStr = phase
        .toExponential(2)
        .toUpperCase()
        .replace("E+0", "E+")
        .replace("E-0", "E-");

      csvLines.push(`${freqStr},${gainStr},${phaseStr}`);
      console.log(`行 ${i + 1} 変換成功: ${freqStr},${gainStr},${phaseStr}`);
    } catch (error) {
      errors.push(`行 ${i + 1}: 処理エラー - ${error.message} - "${line}"`);
    }
  }

  // エラーがある場合は警告を表示
  if (errors.length > 0) {
    console.warn("変換中のエラー:", errors);
    showWarning(`${errors.length}個のエラーがありました`, errors);
  }

  if (csvLines.length <= 1) {
    throw new Error(
      `有効なデータが見つかりませんでした。処理されたエラー:\n${errors.join(
        "\n"
      )}`
    );
  }

  console.log("変換完了。CSVライン数:", csvLines.length);
  return csvLines.join("\n");
}

// ステータス表示
function showStatus(message) {
  status.innerHTML = message;
  status.style.color = "black";
}

// エラー表示
function showError(title, error) {
  status.innerHTML = `エラー: ${title}`;
  status.style.color = "red";

  errorDetails.innerHTML = `
        <strong>${title}:</strong><br>
        ${error.message}<br><br>
        <strong>スタックトレース:</strong><br>
        <pre style="font-size: 11px;">${
          error.stack || "スタックトレースなし"
        }</pre>
    `;
  errorDetails.style.display = "block";
}

// 警告表示
function showWarning(title, warnings) {
  const warningDiv =
    document.getElementById("warningDetails") || createWarningDiv();

  warningDiv.innerHTML = `
        <strong>${title}:</strong><br>
        ${warnings
          .slice(0, 10)
          .map((w) => `• ${w}`)
          .join("<br>")}
        ${warnings.length > 10 ? `<br>... 他 ${warnings.length - 10} 件` : ""}
    `;
  warningDiv.style.display = "block";
}

// 警告用div作成
function createWarningDiv() {
  const warningDiv = document.createElement("div");
  warningDiv.id = "warningDetails";
  warningDiv.style.cssText =
    "margin: 10px 0; padding: 10px; border: 1px solid orange; background-color: #fff3cd; display: none;";
  errorDetails.parentNode.insertBefore(warningDiv, errorDetails.nextSibling);
  return warningDiv;
}

// エラー非表示
function hideError() {
  errorDetails.style.display = "none";
  const warningDiv = document.getElementById("warningDetails");
  if (warningDiv) {
    warningDiv.style.display = "none";
  }
}

// ファイル情報表示
function showFileInfo(file) {
  const fileSize = (file.size / 1024).toFixed(2);
  const lastModified = new Date(file.lastModified).toLocaleString("ja-JP");

  fileInfo.innerHTML = `
        <strong>ファイル情報:</strong><br>
        ファイル名: ${file.name}<br>
        サイズ: ${fileSize} KB<br>
        最終更新: ${lastModified}
    `;
  fileInfo.style.display = "block";
}

// プレビュー表示
function showPreview(csvContent) {
  const lines = csvContent.split("\n");
  const previewLines = lines.slice(0, 10);

  let content = previewLines.join("\n");
  if (lines.length > 10) {
    content += `\n... (残り ${lines.length - 10} 行)`;
  }

  previewContent.textContent = content;
  preview.style.display = "block";
}

// CSVダウンロード
function downloadCSV() {
  if (!convertedCSV) {
    showError(
      "ダウンロードエラー",
      new Error("ダウンロードするデータがありません")
    );
    return;
  }

  try {
    const blob = new Blob([convertedCSV], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `${originalFileName}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showStatus("ファイルがダウンロードされました！");
    } else {
      throw new Error("ブラウザがファイルダウンロードをサポートしていません");
    }
  } catch (error) {
    showError("ダウンロードエラー", error);
    console.error("Download error:", error);
  }
}

// 初期化
document.addEventListener("DOMContentLoaded", function () {
  showStatus("TXTファイルを選択してください");
});