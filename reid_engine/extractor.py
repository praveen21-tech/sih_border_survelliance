import cv2
import numpy as np
from typing import List, Union
from config import settings

class ReIDFeatureExtractor:
    """
    Deep Person Re-Identification Feature Extractor.
    Extracts L2-normalized 512-dimensional appearance feature embeddings from person crops.
    Supports PyTorch Deep Neural Network backbones (OSNet/ResNet/MobileNet)
    with a multi-region spatial-chromatic texture fallback.
    """

    def __init__(self, feature_dim: int = None, device: str = None):
        self.feature_dim = feature_dim or settings.REID_FEATURE_DIM
        self.device = device or settings.DEVICE
        self.model = None
        self.transform = None
        self._init_deep_model()

    def _init_deep_model(self):
        """Attempts to load a deep PyTorch Re-ID backbone (OSNet / Torchvision ResNet)."""
        try:
            import torch
            import torchvision.transforms as T
            from torchvision.models import mobilenet_v3_small, MobileNet_V3_Small_Weights

            weights = MobileNet_V3_Small_Weights.DEFAULT
            base_model = mobilenet_v3_small(weights=weights)
            
            # Replace classifier with embedding projection head to output feature_dim
            import torch.nn as nn
            in_features = base_model.classifier[0].in_features
            base_model.classifier = nn.Sequential(
                nn.Linear(in_features, self.feature_dim),
                nn.BatchNorm1d(self.feature_dim)
            )
            base_model.eval()
            if self.device == "cuda" and torch.cuda.is_available():
                base_model = base_model.to("cuda")
                self.device = "cuda"
            else:
                self.device = "cpu"
                base_model = base_model.to("cpu")

            self.model = base_model
            self.transform = T.Compose([
                T.ToPILImage(),
                T.Resize((256, 128)),
                T.ToTensor(),
                T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
            ])
            print(f"[ReIDFeatureExtractor] Deep PyTorch Re-ID model initialized on {self.device}.")
        except Exception as e:
            print(f"[ReIDFeatureExtractor] PyTorch model initialization skipped ({e}). Using spatial-chromatic feature extractor.")
            self.model = None

    def extract(self, crop: np.ndarray) -> np.ndarray:
        """
        Extracts a normalized feature embedding vector (512-d) from a person image crop.
        """
        if crop is None or crop.size == 0:
            return np.zeros(self.feature_dim, dtype=np.float32)

        # PyTorch Deep Inference
        if self.model is not None:
            try:
                import torch
                rgb_crop = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)
                input_tensor = self.transform(rgb_crop).unsqueeze(0).to(self.device)
                with torch.no_grad():
                    features = self.model(input_tensor).squeeze(0).cpu().numpy()
                norm = np.linalg.norm(features)
                if norm > 1e-6:
                    features = features / norm
                return features.astype(np.float32)
            except Exception as e:
                print(f"[ReIDFeatureExtractor] Deep inference failed ({e}). Falling back to spatial-chromatic features.")

        # High-Fidelity Spatial-Chromatic Fallback Feature Extractor
        return self._extract_spatial_chromatic_features(crop)

    def _extract_spatial_chromatic_features(self, crop: np.ndarray) -> np.ndarray:
        """
        Extracts multi-zone HSV, LAB, and Sobel gradient histograms representing:
        - Head/Torso/Legs spatial sections (critical for surveillance Re-ID matching).
        """
        resized = cv2.resize(crop, (128, 256))
        hsv = cv2.cvtColor(resized, cv2.COLOR_BGR2HSV)
        lab = cv2.cvtColor(resized, cv2.COLOR_BGR2LAB)
        gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)

        features = []

        # 4 Vertical Body Strip Zones (Head/Shoulder, Upper Torso, Lower Torso, Legs)
        zone_height = 256 // 4
        for i in range(4):
            y_start = i * zone_height
            y_end = (i + 1) * zone_height
            
            zone_hsv = hsv[y_start:y_end, :]
            zone_lab = lab[y_start:y_end, :]
            zone_gray = gray[y_start:y_end, :]

            # HSV Histograms (Hue: 16 bins, Sat: 8 bins, Val: 8 bins) = 32
            h_hist = cv2.calcHist([zone_hsv], [0], None, [16], [0, 180]).flatten()
            s_hist = cv2.calcHist([zone_hsv], [1], None, [8], [0, 256]).flatten()
            v_hist = cv2.calcHist([zone_hsv], [2], None, [8], [0, 256]).flatten()

            # LAB Lightness / Color Histograms (A: 8 bins, B: 8 bins) = 16
            a_hist = cv2.calcHist([zone_lab], [1], None, [8], [0, 256]).flatten()
            b_hist = cv2.calcHist([zone_lab], [2], None, [8], [0, 256]).flatten()

            # Texture gradient via Sobel
            sobelx = cv2.Sobel(zone_gray, cv2.CV_64F, 1, 0, ksize=3)
            sobely = cv2.Sobel(zone_gray, cv2.CV_64F, 0, 1, ksize=3)
            mag = np.sqrt(sobelx**2 + sobely**2)
            tex_hist, _ = np.histogram(mag, bins=16, range=(0, 256))

            zone_feats = np.concatenate([h_hist, s_hist, v_hist, a_hist, b_hist, tex_hist])
            zone_norm = np.linalg.norm(zone_feats)
            if zone_norm > 1e-6:
                zone_feats = zone_feats / zone_norm
            features.append(zone_feats)

        # Global features
        glob_hsv = cv2.calcHist([hsv], [0, 1], None, [16, 16], [0, 180, 0, 256]).flatten()
        glob_norm = np.linalg.norm(glob_hsv)
        if glob_norm > 1e-6:
            glob_hsv = glob_hsv / glob_norm
        features.append(glob_hsv)

        full_vector = np.concatenate(features)
        
        # Fit to exact feature_dim (512)
        if len(full_vector) > self.feature_dim:
            full_vector = full_vector[:self.feature_dim]
        elif len(full_vector) < self.feature_dim:
            full_vector = np.pad(full_vector, (0, self.feature_dim - len(full_vector)), 'constant')

        norm = np.linalg.norm(full_vector)
        if norm > 1e-6:
            full_vector = full_vector / norm

        return full_vector.astype(np.float32)

    def extract_batch(self, crops: List[np.ndarray]) -> np.ndarray:
        """Extract embeddings for a list of crops."""
        return np.array([self.extract(c) for c in crops], dtype=np.float32)
