import { registerBlockBehavior } from "../BlockBehavior.js";
import { ParagraphBehavior } from "./ParagraphBehavior.js";
import { ImageBehavior } from "./ImageBehavior.js";
import { EquationBehavior } from "./EquationBehavior.js";

export function registerAllBehaviors(): void {
  const paragraphBehavior = new ParagraphBehavior();
  const imageBehavior = new ImageBehavior();
  const equationBehavior = new EquationBehavior();
  
  registerBlockBehavior("paragraph", paragraphBehavior);
  registerBlockBehavior("heading", paragraphBehavior);
  registerBlockBehavior("list-item", paragraphBehavior);
  registerBlockBehavior("ordered-list-item", paragraphBehavior);
  registerBlockBehavior("image", imageBehavior);
  registerBlockBehavior("equation", equationBehavior);
}
