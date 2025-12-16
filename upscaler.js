// Advanced Image Upscaler - Pure JavaScript Implementation
// Uses Lanczos resampling, unsharp masking, and progressive enhancement

class ImageUpscaler {
    constructor() {
        this.originalImage = null;
        this.scaleFactor = 2;
        this.settings = {
            sharpen: true,
            denoise: true,
            contrast: true,
            colorEnhance: true,
            sharpness: 0.5
        };
        this.initializeUI();
    }

    initializeUI() {
        // File input handling
        const uploadSection = document.getElementById('uploadSection');
        const fileInput = document.getElementById('fileInput');

        uploadSection.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => this.handleFileSelect(e.target.files[0]));

        // Drag and drop
        uploadSection.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadSection.classList.add('drag-over');
        });

        uploadSection.addEventListener('dragleave', () => {
            uploadSection.classList.remove('drag-over');
        });

        uploadSection.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadSection.classList.remove('drag-over');
            if (e.dataTransfer.files.length > 0) {
                this.handleFileSelect(e.dataTransfer.files[0]);
            }
        });

        // Scale factor buttons
        document.querySelectorAll('.scale-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.scale-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.scaleFactor = parseInt(btn.dataset.scale);
            });
        });

        // Enhancement options
        document.getElementById('sharpenCheck').addEventListener('change', (e) => {
            this.settings.sharpen = e.target.checked;
        });
        document.getElementById('denoiseCheck').addEventListener('change', (e) => {
            this.settings.denoise = e.target.checked;
        });
        document.getElementById('contrastCheck').addEventListener('change', (e) => {
            this.settings.contrast = e.target.checked;
        });
        document.getElementById('colorCheck').addEventListener('change', (e) => {
            this.settings.colorEnhance = e.target.checked;
        });

        // Sharpness slider
        const sharpnessSlider = document.getElementById('sharpnessSlider');
        sharpnessSlider.addEventListener('input', (e) => {
            this.settings.sharpness = e.target.value / 100;
            document.getElementById('sharpnessValue').textContent = e.target.value + '%';
        });

        // Action buttons
        document.getElementById('upscaleBtn').addEventListener('click', () => this.processImage());
        document.getElementById('downloadBtn').addEventListener('click', () => this.downloadImage());
        document.getElementById('newImageBtn').addEventListener('click', () => this.reset());
    }

    handleFileSelect(file) {
        if (!file || !file.type.startsWith('image/')) {
            alert('Please select a valid image file');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                if (img.width > 4096 || img.height > 4096) {
                    alert('Image is too large. Maximum size is 4096×4096 pixels.');
                    return;
                }
                this.originalImage = img;
                this.displayOriginal();
                document.getElementById('previewSection').classList.add('active');
                document.getElementById('uploadSection').style.display = 'none';
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    displayOriginal() {
        const canvas = document.getElementById('originalCanvas');
        const ctx = canvas.getContext('2d');

        canvas.width = this.originalImage.width;
        canvas.height = this.originalImage.height;
        ctx.drawImage(this.originalImage, 0, 0);

        document.getElementById('originalInfo').textContent =
            `${this.originalImage.width} × ${this.originalImage.height} px`;
    }

    async processImage() {
        const startTime = performance.now();
        const upscaleBtn = document.getElementById('upscaleBtn');
        const downloadBtn = document.getElementById('downloadBtn');
        const progressContainer = document.getElementById('progressContainer');

        upscaleBtn.disabled = true;
        downloadBtn.disabled = true;
        progressContainer.classList.add('active');

        try {
            // Step 1: Lanczos upscaling
            this.updateProgress(10, 'Initializing Lanczos resampling...');
            const upscaledCanvas = await this.lanczosUpscale(
                this.originalImage,
                this.scaleFactor
            );

            // Step 2: Progressive enhancement
            this.updateProgress(50, 'Applying edge-preserving enhancement...');
            await this.sleep(100);

            if (this.settings.denoise) {
                this.updateProgress(60, 'Reducing noise...');
                this.applyBilateralFilter(upscaledCanvas);
            }

            if (this.settings.sharpen) {
                this.updateProgress(70, 'Sharpening edges...');
                this.applyUnsharpMask(upscaledCanvas, this.settings.sharpness);
            }

            if (this.settings.contrast) {
                this.updateProgress(80, 'Normalizing contrast...');
                this.normalizeContrast(upscaledCanvas);
            }

            if (this.settings.colorEnhance) {
                this.updateProgress(90, 'Enhancing colors...');
                this.enhanceColors(upscaledCanvas);
            }

            this.updateProgress(100, 'Complete!');

            // Display result
            const resultCanvas = document.getElementById('upscaledCanvas');
            resultCanvas.width = upscaledCanvas.width;
            resultCanvas.height = upscaledCanvas.height;
            const resultCtx = resultCanvas.getContext('2d');
            resultCtx.drawImage(upscaledCanvas, 0, 0);

            document.getElementById('upscaledInfo').textContent =
                `${upscaledCanvas.width} × ${upscaledCanvas.height} px`;

            const endTime = performance.now();
            const processingTime = ((endTime - startTime) / 1000).toFixed(2);
            document.getElementById('processingTime').textContent = `${processingTime}s`;
            document.getElementById('qualityGain').textContent = `${this.scaleFactor}×`;

            downloadBtn.disabled = false;

            setTimeout(() => {
                progressContainer.classList.remove('active');
            }, 2000);

        } catch (error) {
            console.error('Processing error:', error);
            alert('An error occurred during processing. Please try again.');
            progressContainer.classList.remove('active');
        } finally {
            upscaleBtn.disabled = false;
        }
    }

    async lanczosUpscale(image, scale) {
        const srcWidth = image.width;
        const srcHeight = image.height;
        const destWidth = srcWidth * scale;
        const destHeight = srcHeight * scale;

        // Create source canvas
        const srcCanvas = document.createElement('canvas');
        srcCanvas.width = srcWidth;
        srcCanvas.height = srcHeight;
        const srcCtx = srcCanvas.getContext('2d');
        srcCtx.drawImage(image, 0, 0);
        const srcData = srcCtx.getImageData(0, 0, srcWidth, srcHeight);

        // Create destination canvas
        const destCanvas = document.createElement('canvas');
        destCanvas.width = destWidth;
        destCanvas.height = destHeight;
        const destCtx = destCanvas.getContext('2d');
        const destData = destCtx.createImageData(destWidth, destHeight);

        // Lanczos kernel parameter
        const a = 3;

        // Process in tiles for large images
        const tileSize = 256;
        const tilesX = Math.ceil(destWidth / tileSize);
        const tilesY = Math.ceil(destHeight / tileSize);
        const totalTiles = tilesX * tilesY;
        let processedTiles = 0;

        for (let ty = 0; ty < tilesY; ty++) {
            for (let tx = 0; tx < tilesX; tx++) {
                const startX = tx * tileSize;
                const startY = ty * tileSize;
                const endX = Math.min(startX + tileSize, destWidth);
                const endY = Math.min(startY + tileSize, destHeight);

                for (let y = startY; y < endY; y++) {
                    for (let x = startX; x < endX; x++) {
                        const srcX = x / scale;
                        const srcY = y / scale;

                        const [r, g, b, alpha] = this.lanczosInterpolate(
                            srcData, srcWidth, srcHeight, srcX, srcY, a
                        );

                        const destIdx = (y * destWidth + x) * 4;
                        destData.data[destIdx] = r;
                        destData.data[destIdx + 1] = g;
                        destData.data[destIdx + 2] = b;
                        destData.data[destIdx + 3] = alpha;
                    }
                }

                processedTiles++;
                const progress = 10 + (processedTiles / totalTiles) * 40;
                this.updateProgress(progress, `Upscaling: ${Math.round(progress - 10)}% complete`);
                await this.sleep(0);
            }
        }

        destCtx.putImageData(destData, 0, 0);
        return destCanvas;
    }

    lanczosInterpolate(imageData, width, height, x, y, a) {
        const data = imageData.data;
        let r = 0, g = 0, b = 0, alpha = 0, weightSum = 0;

        const startX = Math.floor(x) - a + 1;
        const startY = Math.floor(y) - a + 1;

        for (let ky = 0; ky < 2 * a; ky++) {
            for (let kx = 0; kx < 2 * a; kx++) {
                const sx = startX + kx;
                const sy = startY + ky;

                if (sx >= 0 && sx < width && sy >= 0 && sy < height) {
                    const dx = x - sx;
                    const dy = y - sy;
                    const weight = this.lanczosKernel(dx, a) * this.lanczosKernel(dy, a);

                    const idx = (sy * width + sx) * 4;
                    r += data[idx] * weight;
                    g += data[idx + 1] * weight;
                    b += data[idx + 2] * weight;
                    alpha += data[idx + 3] * weight;
                    weightSum += weight;
                }
            }
        }

        if (weightSum > 0) {
            r /= weightSum;
            g /= weightSum;
            b /= weightSum;
            alpha /= weightSum;
        }

        return [
            Math.max(0, Math.min(255, Math.round(r))),
            Math.max(0, Math.min(255, Math.round(g))),
            Math.max(0, Math.min(255, Math.round(b))),
            Math.max(0, Math.min(255, Math.round(alpha)))
        ];
    }

    lanczosKernel(x, a) {
        if (x === 0) return 1;
        if (Math.abs(x) >= a) return 0;

        const piX = Math.PI * x;
        return (a * Math.sin(piX) * Math.sin(piX / a)) / (piX * piX);
    }

    applyUnsharpMask(canvas, amount) {
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const blurred = this.gaussianBlur(imageData, 1.5);

        const data = imageData.data;
        const blurData = blurred.data;
        const strength = amount * 1.5;

        for (let i = 0; i < data.length; i += 4) {
            for (let c = 0; c < 3; c++) {
                const original = data[i + c];
                const blur = blurData[i + c];
                const sharpened = original + (original - blur) * strength;
                data[i + c] = Math.max(0, Math.min(255, sharpened));
            }
        }

        ctx.putImageData(imageData, 0, 0);
    }

    gaussianBlur(imageData, radius) {
        const width = imageData.width;
        const height = imageData.height;
        const output = new ImageData(width, height);
        const data = imageData.data;
        const outData = output.data;

        const kernel = this.createGaussianKernel(radius);
        const kernelSize = kernel.length;
        const half = Math.floor(kernelSize / 2);

        // Horizontal pass
        const temp = new Uint8ClampedArray(data.length);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let r = 0, g = 0, b = 0, a = 0;
                for (let k = 0; k < kernelSize; k++) {
                    const sx = Math.min(width - 1, Math.max(0, x + k - half));
                    const idx = (y * width + sx) * 4;
                    const weight = kernel[k];
                    r += data[idx] * weight;
                    g += data[idx + 1] * weight;
                    b += data[idx + 2] * weight;
                    a += data[idx + 3] * weight;
                }
                const idx = (y * width + x) * 4;
                temp[idx] = r;
                temp[idx + 1] = g;
                temp[idx + 2] = b;
                temp[idx + 3] = a;
            }
        }

        // Vertical pass
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let r = 0, g = 0, b = 0, a = 0;
                for (let k = 0; k < kernelSize; k++) {
                    const sy = Math.min(height - 1, Math.max(0, y + k - half));
                    const idx = (sy * width + x) * 4;
                    const weight = kernel[k];
                    r += temp[idx] * weight;
                    g += temp[idx + 1] * weight;
                    b += temp[idx + 2] * weight;
                    a += temp[idx + 3] * weight;
                }
                const idx = (y * width + x) * 4;
                outData[idx] = r;
                outData[idx + 1] = g;
                outData[idx + 2] = b;
                outData[idx + 3] = a;
            }
        }

        return output;
    }

    createGaussianKernel(radius) {
        const sigma = radius / 2;
        const size = Math.ceil(radius * 2) + 1;
        const kernel = [];
        let sum = 0;

        for (let i = 0; i < size; i++) {
            const x = i - Math.floor(size / 2);
            const value = Math.exp(-(x * x) / (2 * sigma * sigma));
            kernel.push(value);
            sum += value;
        }

        // Normalize
        return kernel.map(v => v / sum);
    }

    applyBilateralFilter(canvas) {
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const width = canvas.width;
        const height = canvas.height;
        const output = new Uint8ClampedArray(data);

        const spatialSigma = 3;
        const rangeSigma = 50;
        const windowSize = 5;
        const half = Math.floor(windowSize / 2);

        for (let y = half; y < height - half; y++) {
            for (let x = half; x < width - half; x++) {
                const centerIdx = (y * width + x) * 4;
                let r = 0, g = 0, b = 0, weightSum = 0;

                for (let ky = -half; ky <= half; ky++) {
                    for (let kx = -half; kx <= half; kx++) {
                        const nx = x + kx;
                        const ny = y + ky;
                        const idx = (ny * width + nx) * 4;

                        const spatialDist = kx * kx + ky * ky;
                        const spatialWeight = Math.exp(-spatialDist / (2 * spatialSigma * spatialSigma));

                        const dr = data[idx] - data[centerIdx];
                        const dg = data[idx + 1] - data[centerIdx + 1];
                        const db = data[idx + 2] - data[centerIdx + 2];
                        const rangeDist = dr * dr + dg * dg + db * db;
                        const rangeWeight = Math.exp(-rangeDist / (2 * rangeSigma * rangeSigma));

                        const weight = spatialWeight * rangeWeight;
                        r += data[idx] * weight;
                        g += data[idx + 1] * weight;
                        b += data[idx + 2] * weight;
                        weightSum += weight;
                    }
                }

                if (weightSum > 0) {
                    output[centerIdx] = r / weightSum;
                    output[centerIdx + 1] = g / weightSum;
                    output[centerIdx + 2] = b / weightSum;
                }
            }
        }

        for (let i = 0; i < data.length; i += 4) {
            data[i] = output[i];
            data[i + 1] = output[i + 1];
            data[i + 2] = output[i + 2];
        }

        ctx.putImageData(imageData, 0, 0);
    }

    normalizeContrast(canvas) {
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Calculate histogram
        const histogram = new Array(256).fill(0);
        for (let i = 0; i < data.length; i += 4) {
            const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
            histogram[gray]++;
        }

        // Calculate cumulative distribution
        const cdf = new Array(256);
        cdf[0] = histogram[0];
        for (let i = 1; i < 256; i++) {
            cdf[i] = cdf[i - 1] + histogram[i];
        }

        // Normalize
        const totalPixels = canvas.width * canvas.height;
        const cdfMin = cdf.find(v => v > 0);

        for (let i = 0; i < data.length; i += 4) {
            for (let c = 0; c < 3; c++) {
                const value = data[i + c];
                const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
                const normalized = ((cdf[gray] - cdfMin) / (totalPixels - cdfMin)) * 255;
                const ratio = normalized / gray;
                data[i + c] = Math.max(0, Math.min(255, Math.round(value * ratio * 0.3 + value * 0.7)));
            }
        }

        ctx.putImageData(imageData, 0, 0);
    }

    enhanceColors(canvas) {
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // Convert to HSL
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const l = (max + min) / 2;

            let s = 0;
            if (max !== min) {
                s = l > 127.5 ? (max - min) / (510 - max - min) : (max - min) / (max + min);
            }

            // Boost saturation by 20%
            s = Math.min(1, s * 1.2);

            // Convert back to RGB
            if (s === 0) {
                continue;
            }

            const c = (1 - Math.abs(2 * l / 255 - 1)) * s;
            const x = c * (1 - Math.abs(((max - min === 0 ? 0 : (max === r ? (g - b) / (max - min) : max === g ? 2 + (b - r) / (max - min) : 4 + (r - g) / (max - min))) % 2) - 1));
            const m = l / 255 - c / 2;

            let rNew, gNew, bNew;
            if (max === r && g >= b) {
                rNew = c; gNew = x; bNew = 0;
            } else if (max === r) {
                rNew = c; gNew = 0; bNew = x;
            } else if (max === g && b >= r) {
                rNew = 0; gNew = c; bNew = x;
            } else if (max === g) {
                rNew = x; gNew = c; bNew = 0;
            } else if (r >= g) {
                rNew = x; gNew = 0; bNew = c;
            } else {
                rNew = 0; gNew = x; bNew = c;
            }

            data[i] = Math.round((rNew + m) * 255 * 0.3 + r * 0.7);
            data[i + 1] = Math.round((gNew + m) * 255 * 0.3 + g * 0.7);
            data[i + 2] = Math.round((bNew + m) * 255 * 0.3 + b * 0.7);
        }

        ctx.putImageData(imageData, 0, 0);
    }

    updateProgress(percent, text) {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        progressFill.style.width = percent + '%';
        progressFill.textContent = Math.round(percent) + '%';
        progressText.textContent = text;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    downloadImage() {
        const canvas = document.getElementById('upscaledCanvas');
        const link = document.createElement('a');
        link.download = `upscaled-${this.scaleFactor}x-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }

    reset() {
        this.originalImage = null;
        document.getElementById('previewSection').classList.remove('active');
        document.getElementById('uploadSection').style.display = 'block';
        document.getElementById('fileInput').value = '';
        document.getElementById('downloadBtn').disabled = true;
        document.getElementById('processingTime').textContent = '-';
        document.getElementById('qualityGain').textContent = '-';

        // Reset canvases
        const originalCanvas = document.getElementById('originalCanvas');
        const upscaledCanvas = document.getElementById('upscaledCanvas');
        originalCanvas.getContext('2d').clearRect(0, 0, originalCanvas.width, originalCanvas.height);
        upscaledCanvas.getContext('2d').clearRect(0, 0, upscaledCanvas.width, upscaledCanvas.height);
    }
}

// Initialize the upscaler when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new ImageUpscaler();
});
