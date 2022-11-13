const imageCache: { [uri: string]: HTMLImageElement } = {};

function loadImageInternalAsync(uri: string, width?: number, height?: number): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image(width, height);
        image.onload = () => resolve(image);
        image.onerror = (event, source, line, column, error) => reject(error);
        image.src = uri;
    });
}

export async function loadImageAsync(uri: string, width?: number, height?: number): Promise<HTMLImageElement> {
    const cachedImage = imageCache[uri];
    if (cachedImage) {
        return cachedImage;
    }

    const image = await loadImageInternalAsync(uri, width, height);
    imageCache[uri] = image;
    return image;
}
