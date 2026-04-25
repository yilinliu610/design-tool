#Deigner's toolbox

A browser-based design tool for applying computational image effects and compositing outputs. 

what it does
Upload an image. Apply an effect. Save what interests you. Arrange the pieces.
The tool is split into two modes: Effects, where you process images, and Composition, where saved outputs become layers you can reorder and arrange like a non-destructive collage.

effects
texturize
effectdescriptionNoiseAdds structured grain to the image — not random static, but layered noise that preserves underlying form while destabilizing surface fidelityASCIIConverts luminance values into a grid of characters; dense regions map to heavier glyphs, open regions fall awayFind EdgesIsolates edge gradients via convolution — turns photographs into their own structural argument
filter
effectdescriptionFrosted GlassApplies a blur with a translucency mask; the image becomes present and withheld simultaneouslyGradient MapRemaps luminance values to a custom color ramp, flattening tonal complexity into something more legible — or stranger
generative effect
effectdescriptionPseudo-TD TrackingSimulates TouchDesigner-style feedback loops: the image accumulates traces of itself, producing smear and recursion artifactsDraw to ChromeRenders the image as if reflected in a distorted metallic surface — form survives, color inverts, depth becomes unreliable

workflow
upload image → select effect → apply → preview output → capture to layer
Once an output is captured, it lives in Composition mode, where you can:

reorder layers via drag-and-drop
toggle layer visibility
adjust blend modes and opacity
export the final composition as a flat image


composition mode
Composition mode works like a stripped-down Photoshop: each captured output becomes an independent layer. Layers can be rearranged, shown or hidden, and blended. The mode is designed for working with multiple passes of the same image — running it through ASCII and then Find Edges, for instance, and seeing what survives the compression.
