/*
 * UI elements for Altspace.
 */
import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import { PrimitiveShape, TextAnchorLocation, CollisionLayer } from '@microsoft/mixed-reality-extension-sdk';

export type HostWorldTransform = Partial<MRE.Transform>;

/*
 * Description of an element's size.  height/width is the primary plane.
 */
export interface ElementSize {
	height: number;
	width: number;
	depth?: number;
}

/*
 * Interface for console layout parameters.
 * gutterY and gutterX is the amount of space in each direction to leave between elements added
 * to the console.
 */
export interface GriddedConsoleLayout {
	gutterY: number;
	gutterX: number;
}

abstract class UIElement {
	public abstract get parent(): MRE.Actor | UIElement;
	public abstract set parent(parent: MRE.Actor | UIElement);
	public abstract get transform(): MRE.ActorTransform;
	public abstract set transform(xform: MRE.ActorTransform);
	public abstract destroy(): void;
}

export type GriddedElementType = MRE.Actor | UIElement;
 
/**
	* GriddedConsole class -- for managing a grid console of UI components.
	* Currently, only buttons are supported.
	*/
export class GriddedConsole {
	private elements: GriddedElementType[];
	private container: MRE.Actor;

	/*
	 * Constructor.
	 */
	constructor(context: MRE.Context, private layout: GriddedConsoleLayout, private elementSize: ElementSize,
		private cols = 1) {
		this.elements = new Array<MRE.Actor>();
		this.container = MRE.Actor.Create(context);
	}

	/**
	 * Add an element to the console.
	 * @param element The button to be added.
	 * @param colSpan The number of columns in the grid the element should span.
	 */
	public addElement(element: GriddedElementType, colSpan = 1) {
		// Set the parent to the continer.
		element.parent = this.container;

		// Move the button to where it should be in the container.
		const numElements = this.elements.length;
		const row = Math.floor(numElements / this.cols);
		const startCol = numElements % this.cols;

		// Calculate the end column.  Don't go beyond the number of columns
		// in the container.
		const endCol = Math.min(startCol + colSpan - 1, this.cols);

		const elementMidcol = (startCol + endCol) / 2;

		const consoleMidpoint = (this.cols - 1) / 2;

		element.transform.local.position
			= new MRE.Vector3((elementMidcol - consoleMidpoint) * (this.elementSize.width + this.layout.gutterX), 0,
				-(this.elementSize.height + this.layout.gutterY) * row);

		// Add the new element to the console's array of elements.
		this.elements.push(element);

		// Push null elements onto the array to account for multi-column elements.
		for (let i = startCol + 1; i <= endCol; ++i) {
			this.elements.push(null);
		}
	}

	/*
	 * Removes an element from the console.
	 */
	public removeElement(element: MRE.Actor) {
		// Search for the button in the array.
		const index = this.elements.indexOf(element);
		if (index > -1) {
			// Remove the button from the array.  Don't actually change the number of elements in the array,
			// since the size of the array is used to positon the next element added to the console and se
			// don't want one element added at the same position as another.
			this.elements[index] = null;

			// Destroy the element itself.
			element.destroy();
		}
	}

	/**
	 * Get the transform for the console.
	 */
	public get transform() {
		return this.container.transform;
	}

	/**
	 * Set the transform for the console.
	 */
	public set transform(xform: MRE.ActorTransform) {
		this.container.transform = xform;
	}

	/**
	 * Empties the console of all its elements and resets it to its start state.
	 */
	public clear() {
		// Destroy all the elements in the array.
		for (const element of this.elements) {
			if (element) {
				element.destroy();
			}
		}

		// Empty the array itself.
		this.elements.length = 0;
	}
}

export class UILabel extends UIElement {
	public static labelHeight(text: string, size: ElementSize, fillPct: number) {
		// Estimate the number of max-height chars that will fit in the width.
		const nbrCharsToHold = 2 * size.width / size.height;	// Height:Width is around 2 for most fonts.

		// If more chars than that, will need to shrink the font.
		let ratio = 1;
		if (nbrCharsToHold < text.length) {
			ratio = nbrCharsToHold / text.length;
		}

		ratio *= fillPct;

		return size.height * ratio;
	}

	constructor(private container: MRE.Actor, private label: MRE.Actor,
		private labelSize: ElementSize, private fillPct: number) { super(); }

	public get transform() {
		return this.container.transform;
	}

	public set transform(xform: MRE.ActorTransform) {
		this.container.transform = xform;
	}

	public get text() {
		return this.label.text;
	}

	public updateLabel(text: string) {
		this.label.text.contents = text;
		this.label.text.height = UILabel.labelHeight(text, this.labelSize, this.fillPct);
	}

	public get parent() {
		return this.container.parent;
	}

	public set parent(parent: MRE.Actor) {
		this.container.parent = parent;
	}

	public destroy() {
		this.container.destroy();
	}
}

export class UIButton extends UIElement {
	constructor(public button: MRE.Actor, public label: UILabel) { super(); }

	public get parent() { return this.button.parent }

	public set parent(parent: MRE.Actor) {
		this.button.parent = parent;
	}

	public get transform() {
		return this.button.transform;
	}

	public set transform(xform: MRE.ActorTransform) {
		this.button.transform = xform;
	}

	public destroy() {
		this.label?.destroy();
		this.button.destroy();

		this.label = null;
		this.button = null;
	}
}


export class AltspaceUI {
	/**
	* Constructs a new instance of this class.
	 * @param context The MRE SDK context.
	 * @param assets The AssetContainer for this MRE.
	 */
	constructor(private context: MRE.Context, private assets: MRE.AssetContainer) { }

	/**
	 * Translates a Unity transform to an MRE transform.  Designed to help align MRE-created objects with
	 * the Unity world they are in.
	 * @param x The Unity transform's X position.
	 * @param y The Unity transform's Y position.
	 * @param z The Unity transform's Z position.
	 * @param xrot The Unity transform's X rotation.
	 * @param yrot The Unity transform's Y rotation.
	 * @param zrot The Unity transform's Z rotation.
	 */
	public static Unity2MRETransform(x: number, y: number, z: number, xrot = 0, yrot = 0, zrot = 0):
		HostWorldTransform {
		return {
			position: new MRE.Vector3(x, y, z),
			rotation: MRE.Quaternion.FromEulerAngles(xrot * MRE.DegreesToRadians,
				yrot * MRE.DegreesToRadians,
				zrot * MRE.DegreesToRadians
			)
		};
	}

	/**
	 * Create a gridded console.
	 * @param layout Layout parameters for the console.
	 * @param elementSize The size of elements to place on the console.
	 * @param cols The number of columns of elements on the console.
	 * 
	 * The console will grow rows as needed.
	 */
	public createGriddedConsole(layout: GriddedConsoleLayout, elementSize: ElementSize, cols = 1) {
		const console = new GriddedConsole(this.context, layout, elementSize, cols);

		return console;
	}

	/**
	 * Creates a button element of the specified size.
	 * @param size The dimensions of the button to be created.
	 * @param options Optional parameters.
	 *			text: Button text.
	 *			buttonMaterial: Material for the button (not including text).
	 *			onClick: A handler to call when the button is clicked.
	 *			onHover: {hoverType, handler}(s) to call when the button is hovered over.
	 *			buttonActorProps: MRE.Actor properties.  Passed to the MRE.CreatePrimitive() function
	 *				at creation time.
	 *			labelFillPct: The percentage for both directions the button text should fill the button.
	 *				Defaults to 0.9.
	 */
	public createButton(size: ElementSize,
		options?: {
			text?: string;
			buttonMaterial?: MRE.Material;
			onClick?: MRE.ActionHandler<MRE.ButtonEventData>;
			onButton?: [{ buttonType: "pressed" | "holding" | "released"; handler: MRE.ActionHandler<MRE.ButtonEventData> }];
			onHover?: [{ hoverType: "enter" | "exit" | "hovering"; handler: MRE.ActionHandler<MRE.ButtonEventData> }];
			buttonActorProps?: Partial<MRE.ActorLike>;
			labelFillPct?: number;
		}) {
		// Create the box to enclose the button.
		// Create a button to delete the plane for the user.
		const depth = size.depth ?? 0.01;

		const button = MRE.Actor.CreatePrimitive(
			this.assets,
			{
				definition: {
					shape: PrimitiveShape.Box,
					dimensions: { x: size.width, y: depth, z: size.height }
				},
				addCollider: true,
				actor: options?.buttonActorProps ?? {}
			}
		);

		// Wait for button to be created before setting the collision layer and assigning
		// the handlers.
		button.created().then(() => {
			//button.setCollider(MRE.ColliderType.Box, false);
			button.collider.layer = CollisionLayer.Hologram;

			// If a material for the button was provided, use it.
			if (options?.buttonMaterial) {
				button.appearance.material = options.buttonMaterial;
			}

			// Create a ButtonBehavior object.
			let behavior: MRE.ButtonBehavior;

			// If a click handler was provided, use it.
			if (options?.onClick) {
				behavior = button.setBehavior(MRE.ButtonBehavior).onClick(options.onClick);
			}

			// If a button handlers were provided, use them.
			if (options?.onButton) {
				for (const btn of options.onButton) {
					if (behavior) {
						behavior.onButton(btn.buttonType, btn.handler);
					} else {
						behavior = button.setBehavior(MRE.ButtonBehavior).onButton(btn.buttonType, btn.handler);
					}
				}
			}

			// If a hover handlers were provided, use them.
			if (options?.onHover) {
				for (const hover of options.onHover) {
					if (behavior) {
						behavior.onHover(hover.hoverType, hover.handler);
					} else {
						behavior = button.setBehavior(MRE.ButtonBehavior).onHover(hover.hoverType, hover.handler);
					}
				}
			}
		});

		// Create the label if text was provided.
		let label: UILabel;
		if (options?.text) {
			label = this.createLabel(size, options.text,
				{
					...options,
					...{
						parentId: button.id
					}
				});
			// Move the label outside the button itself.
			Object.assign(label.transform.local.position, { y: depth / 1.9 });
		}

		return new UIButton(button, label);
	}

	public createLabel(size: ElementSize, text: string,
		options?: {
			actorProps?: Partial<MRE.ActorLike>;
			labelFillPct?: number;
			parentId?: MRE.Guid;
		}) {
		// Create the box to enclose the label.
		const labelFillPct = options?.labelFillPct ?? 0.90;

		// Labels are rotated relative to everything else by default.  To ease working with them,
		// use an empty container to hold the label and handle alignment.
		// If a parentId was passed, use it.
		let containerOpts = null;
		if (options?.parentId) {
			containerOpts = { actor: { parentId: options.parentId } };
		}
		const container = MRE.Actor.Create(this.context, containerOpts);

		// Create the label.
		const labelText = new MRE.Text();
		labelText.contents = text;
		labelText.height = UILabel.labelHeight(text, size, labelFillPct);
		labelText.anchor = TextAnchorLocation.MiddleCenter;

		// Create the label.
		// Use options.actorProps if they were provided.
		const label = MRE.Actor.Create(
			this.context,
			{
				actor: {
					...{
						parentId: container.id,
						text: labelText,
						transform: {
							local: {
								rotation: MRE.Quaternion.FromEulerAngles(90 * MRE.DegreesToRadians, 0, 0)
							}
						}
					},
					...(options?.actorProps ?? {})
				},
			}
		);

		return new UILabel(container, label, size, labelFillPct);
	}
}
