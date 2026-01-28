#!/usr/bin/env python3
import sys
import os
sys.path.insert(0, r'C:\Users\abhin\AppData\Roaming\Python\Python313\site-packages')
import cv2
import numpy as np
from ocr.normalization import imageNorm, letterNorm
from ocr import page, words, charSeg
from ocr.helpers import implt, resize
from ocr.tfhelpers import Graph
from ocr.datahelpers import idx2char

# Settings
IMG = sys.argv[1] if len(sys.argv) > 1 else 'test/1.jpg'
LANG = 'cz'  # cz, en
MODEL_LOC = 'models/char-clas/' + LANG + '/CharClassifier'

# Load Trained Model
charClass = Graph(MODEL_LOC)

# Load image
image = cv2.cvtColor(cv2.imread(IMG), cv2.COLOR_BGR2RGB)

# Crop image and get bounding boxes
crop = page.detection(image)
bBoxes = words.detection(crop)

# Recognise words
height = 60
recognized_text = []

for i, b in enumerate(bBoxes):
    x1, y1, x2, y2 = b
    # Cuting out the word image
    img = crop[y1:y2, x1:x2]

    # Pre-processing the word
    img = imageNorm(img, height, border=False, tilt=True, hystNorm=True)

    # Separate letters
    img = cv2.copyMakeBorder(img, 0, 0, 30, 30, cv2.BORDER_CONSTANT, value=[0, 0, 0])
    gaps = charSeg.segmentation(img, RNN=True, debug=False)

    chars = []
    for pos in range(len(gaps) - 1):
        char = img[:, gaps[pos]:gaps[pos+1]]
        # TODO None type error after threshold
        char, dim = letterNorm(char, is_thresh=True, dim=True)
        # TODO Test different values
        if dim[0] > 4 and dim[1] > 4:
            chars.append(char.flatten())

    chars = np.array(chars)
    word = ''
    if len(chars) != 0:
        pred = charClass.run(chars)
        for c in pred:
            word += idx2char(c)

    recognized_text.append(word)

# Output the recognized text
print(' '.join(recognized_text))
