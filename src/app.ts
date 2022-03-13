/*!
 * Licensed under the MIT License.
 *
 * A simple scoreboard MRE.  Takes a single parameter "teams" that contains a comma-separated list of team names.
 * If 'teams' is unspecified, defaults to a single score with the name "Score".
 */

import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import {
	ElementSize, GriddedConsoleLayout, GriddedConsole, AltspaceUI, HostWorldTransform
} from './altspace-ui';
import { Color4 } from '@microsoft/mixed-reality-extension-sdk';

const ElementSize: ElementSize = { height: 0.125, width: 0.5 };
const ConsoleLayout: GriddedConsoleLayout = { gutterY: 0.065, gutterX: 0.065 }
const ConsoleTransform: HostWorldTransform = AltspaceUI.Unity2MRETransform(0, 0, 0, -90, 0, 0);

const TeamsParamName = 'teams';

/**
 * Scoreboard Application - Implements a simple scoreboard.
 */
export default class Scoreboard {
	/*
	 * The console and the teams' scores.
	 */
	private ui: AltspaceUI;
	private board: GriddedConsole;
	private teamNames: string[];
	private score: number[];
	private assets: MRE.AssetContainer;
	private buttonMaterial: MRE.Material;

	/**
	 * Constructs a new instance of this class.
	 * @param context The MRE SDK context.
	 * @param baseUrl The baseUrl to this project's `./public` folder.
	 */
	constructor(private context: MRE.Context, params: MRE.ParameterSet, private baseUrl: string) {
		this.assets = new MRE.AssetContainer(context);

		// Create the array of team names.
		if (TeamsParamName in params) {
			// Split team names at commas.
			this.teamNames = (params[TeamsParamName] as string).split(',');
		} else {
			this.teamNames = ['Score'];
		}

		// Create the array of scores.
		this.score = new Array<number>(this.teamNames.length);

		// Hook the context events we're interested in.
		this.context.onStarted(() => this.started());
	}

	/**
	 * Called when the application session starts up.
	 */
	private started() {
		this.startedImpl();
	}

	// use () => {} syntax here to get proper scope binding when called via setTimeout()
	// if async is required, next line becomes private startedImpl = async () => {
	private startedImpl = () => {
		// Create the UI object.
		this.ui = new AltspaceUI(this.context, this.assets);

		// Create the grid of controls for the scoreboard.  There are four columns:
		// team name, the score, a "+" button, and a "-" button.
		this.board = this.ui.createGriddedConsole(ConsoleLayout, ElementSize, 4);

		// Rotate the board so it is vertical.
		Object.assign(this.board.transform.app, ConsoleTransform);

		// Create a material for the UI buttons, so it won't be bright white.
		this.buttonMaterial = this.assets.createMaterial('gray', { color: new Color4(0.25, 0.25, 0.25) });

		// Loop through all the teams and create their entry onto the scoreboard.
		for (let i = 0; i < this.teamNames.length; ++i) {
			// Initialize the score to 0.
			this.score[i] = 0;

			// Team name is first.
			this.board.addElement(this.ui.createLabel(ElementSize, this.teamNames[i]));

			// The score is next.
			const score = this.ui.createLabel(ElementSize, this.score[i].toString());
			this.board.addElement(score);

			// The "+" button is next.
			this.board.addElement(this.ui.createButton(ElementSize, {
				text: "+",
				buttonMaterial: this.buttonMaterial,
				onButton: [{buttonType: "released", handler: () => { score.updateLabel((++this.score[i]).toString())}}]
			}));

			// The "-" button is next.
			this.board.addElement(this.ui.createButton(ElementSize, {
				text: "-",
				buttonMaterial: this.buttonMaterial,
				onButton: [{buttonType: "released", handler: () => { score.updateLabel((--this.score[i]).toString())}}]
			}));
		}
	}
}
