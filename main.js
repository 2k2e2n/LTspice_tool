let convertedCSV = '';
let originalFileName = '';

document.getElementById('fileInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) processFile(file);
    console.log("ファイルを選択しました！");
});

function processFile(file) {
    resetUI();
    originalFileName = file.name.replace('.txt', '');
    showFileInfo(file);
    showStatus('ファイルを読み込み中...');
    console.log("ファイルを読み込みました");
    
    const reader = new FileReader();
    reader.onload = e => {
        try {
            convertedCSV = convertTxtToCSV(e.target.result);
            showStatus('変換が完了しました！');
            console.log("変換が完了しました！");
            showPreview(convertedCSV);
            document.getElementById('downloadBtn').disabled = false;
        } catch (error) {
            showError('変換エラー', error);
        }
    };
    reader.onerror = () => showError('読み込みエラー', new Error('ファイルの読み込みに失敗'));
    reader.readAsText(file);
}

function convertTxtToCSV(content) {
    const lines = content.trim().split('\n');
    const csvLines = ['frequency,Gain,phase'];
    const errors = [];
    
    lines.forEach((line, i) => {
        line = line.trim();
        if (!line || line.startsWith('Freq.') || line.includes('V(n019)')) return;
        
        const parts = line.split(/\s+/);
        if (parts.length < 2) {
            errors.push(`行 ${i + 1}: データ不足`);
            return;
        }
        
        const frequency = parseFloat(parts[0]);
        if (isNaN(frequency)) {
            errors.push(`行 ${i + 1}: 周波数エラー`);
            return;
        }
        
        // 複数パターンで複素数をパース
        let match = parts[1].match(/\(([^d]+)dB,([^)]+)\)/);
        if (!match) match = parts[1].match(/\(([^,]+),([^)]+)\)/);
        
        if (!match) {
            errors.push(`行 ${i + 1}: 形式エラー`);
            return;
        }
        
        const gain = parseFloat(match[1].replace(/[^\d\.\-\+eE]/g, ''));
        const phase = parseFloat(match[2].replace(/[^\d\.\-\+eE]/g, ''));
        
        if (isNaN(gain) || isNaN(phase)) {
            errors.push(`行 ${i + 1}: 数値エラー`);
            return;
        }
        
        const freqStr = frequency.toExponential(2).replace('e', 'E');
        const gainStr = gain.toExponential(2).replace('e', 'E');
        const phaseStr = phase.toExponential(2).replace('e', 'E');
        
        csvLines.push(`${freqStr},${gainStr},${phaseStr}`);
    });
    
    if (errors.length > 0) showWarning(`${errors.length}個のエラー`, errors.slice(0, 5));
    if (csvLines.length <= 1) throw new Error('有効なデータが見つかりませんでした');
    
    return csvLines.join('\n');
}

function showStatus(message) {
    document.getElementById('status').innerHTML = message;
}

function showError(title, error) {
    document.getElementById('status').innerHTML = `エラー: ${title}`;
    document.getElementById('errorDetails').innerHTML = `
        <strong>${title}:</strong> ${error.message}
    `;
    document.getElementById('errorDetails').style.display = 'block';
}

function showWarning(title, warnings) {
    const warning = document.getElementById('warningDetails') || createWarningDiv();
    warning.innerHTML = `<strong>${title}:</strong><br>${warnings.map(w => `• ${w}`).join('<br>')}`;
    warning.style.display = 'block';
}

function createWarningDiv() {
    const div = document.createElement('div');
    div.id = 'warningDetails';
    div.style.cssText = 'margin: 10px 0; padding: 10px; border: 1px solid orange; background-color: #fff3cd;';
    document.getElementById('errorDetails').parentNode.appendChild(div);
    return div;
}

function showFileInfo(file) {
    document.getElementById('fileInfo').innerHTML = `
        ファイル名: ${file.name} (${(file.size/1024).toFixed(2)} KB)
    `;
    document.getElementById('fileInfo').style.display = 'block';
}

function showPreview(csv) {
    const lines = csv.split('\n').slice(0, 6);
    document.getElementById('previewContent').textContent = 
        lines.join('\n') + (csv.split('\n').length > 6 ? '\n...' : '');
    document.getElementById('preview').style.display = 'block';
}

function downloadCSV() {
    if (!convertedCSV) return showError('ダウンロードエラー', new Error('データがありません'));
    
    const blob = new Blob([convertedCSV], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${originalFileName}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    showStatus('ダウンロード完了！');
    console.log("ダウンロード完了")
}

function resetUI() {
    document.getElementById('errorDetails').style.display = 'none';
    document.getElementById('preview').style.display = 'none';
    document.getElementById('downloadBtn').disabled = true;
    const warning = document.getElementById('warningDetails');
    if (warning) warning.style.display = 'none';
}