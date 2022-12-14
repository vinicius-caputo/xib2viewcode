/*
TODO:
- Work with subviews inside views
- Work with non viewController components, like tableViewcell (base View)
- need to make the diference beteween the conjuction of default rules e rules
- need to make constraints more modular because theathes it one pair of constraints 
- fix constraints variations like multiplier enqualToConstant
*/

import { parser } from 'posthtml-parser'
import { XibNode, Outlet,  UIItems } from './types';
import { rules, resolveResultRule } from './rules';
import { capitalizeFirstLetter } from './Utils';

/**
 * Rercursive function to clear all the useless nodes.
 * 
 * As default postHTML-parser will parse the content of nodes thats are 
 * irrelevant for this implementation, like "\n" and " ", this function make a clean up and set
 * content of null nodes to empty array, making easier to navigate the tree.
 * @param nodes Array of XibNodes
 * @returns Array of XibNodes
 */
function clearEmptyNodes(nodes: XibNode[]): XibNode[] {
    let result: XibNode[] = [];
    if (Array.isArray(nodes)) {
        for (const node of nodes) {
            if ('object' == typeof node) {
                node.content = clearEmptyNodes(node.content);
                result.push(node);
            }
        }
    }
    return result;
}


/**
 * Navigate to xib AST and get all points of interest, like outlets, subvies and constraints
 * @param nodes xib AST 
 */
function navigate(nodes: XibNode[]): void {
    for (const node of nodes) {
        switch (node.tag) {
            case 'outlet':
                outlets.push({
                    property: node.attrs.property,
                    id: node.attrs.destination
                });
                break;
            case 'constraints':
                constraints.push(node);
                break;
            case 'subviews':
                subviews.push(node);
                break;
            case 'viewLayoutGuide':
                uiItems[node.attrs.id] = {
                    tag: node.tag,
                    name: "view.safeAreaLayoutGuide"
                };
                break;
            case 'view':
                uiItems[node.attrs.id] = {
                    tag: node.tag,
                    name: 'view'
                };
                break;
            default:
                break;
        }
        navigate(node.content);
    }
}

/**
 * Try to associate a outlet id with a UI element.
 * 
 * It are used to declare UI elements and constraints with the name of the propety in the original
 * swift file
 * @param id The id of the UI element
 * @returns Name of the UI element with associated outlet id or undefined if not found
 */
function resolveOutletIdToUI(id: string): string|undefined {
    for (const outlet of outlets) {
        if (outlet.id == id) {
            return outlet.property;
        }
    }
    return undefined;
}

function addToUIItems(id: string, tag: string) {
    uiItems[id] = {
        tag: tag,
        name: resolveOutletIdToUI(id) 
    };
}

/**
 * Generete UI declarations like buttons and labels with lazy var anottation.
 * @param nodes xib node wich contains the UI elements
 * @returns String array of declarations 
 */
function generateUIDeclarations(nodes: XibNode[]): string[] {
    const aceptedTags = Object.keys(rules);
    let uiDeclarations: string[] = [];
    for (const node of nodes) {
        if (aceptedTags.includes(node.tag)) {
            addToUIItems(node.attrs.id, node.tag);
            let attributes = node.attrs;
            let property: string = '\n';
            for (const key in attributes) {
                if (rules[node.tag][key] != undefined) {
                    property += `\t${node.tag}.${rules[node.tag][key]} = ${resolveResultRule(attributes[key])}\n`;
                }
            }
            let declaration = `lazy var ${resolveIdToPropetyName(node.attrs.id)}: UI${capitalizeFirstLetter(node.tag)} = {\n\tlet ${node.tag} = UI${capitalizeFirstLetter(node.tag)}()${property}\treturn ${node.tag}\n}() `;
            uiDeclarations.push(declaration);
            console.log(declaration);
        }
    }
    return uiDeclarations;
}

/**
 *  Try to associate a id with a property name of UI element.
 * @param id 
 * @returns name of the property or tag name if not found
 */
function resolveIdToPropetyName(id: string): string {
    return uiItems[id]?.name ?? uiItems[id].tag;
}


function genertaeConstraintsDeclarations(nodes: XibNode[]): string[] {
    // console.log(nodes);
    let propertys: string = '\n';
    let constraintsDeclarations: string[] = [];
    for (const node of nodes) {
        let constant = node.attrs.constant != undefined ? `, constant: ${node.attrs.constant}` : '';
        propertys += `\t${resolveIdToPropetyName(node.attrs.firstItem)}.${node.attrs.firstAttribute}Anchor.constraint(equalTo: ${resolveIdToPropetyName(node.attrs.secondItem)}.${node.attrs.secondAttribute}Anchor${constant}),\n`;
    }
    let declaration = `NSLayoutConstraint.activate([${propertys}])`;
    console.log(declaration);
    
    constraintsDeclarations.push(declaration);
    return constraintsDeclarations;
}

function generateViewHierachy(){
    const aceptedTags = Object.keys(rules);
    for (const key in uiItems) {
        if (aceptedTags.includes(uiItems[key].tag)) {
            console.log(`view.addSubview(${resolveIdToPropetyName(key)})`);
        }
    }
}

let outlets: Outlet[] = [];
let constraints: XibNode[] = [];
let subviews: XibNode[] = [];
let uiItems: UIItems = {};
let baseView: XibNode[] = [];

function main() {
    const fs = require('fs')
    let xib = fs.readFileSync('samples/TesteViewController.xib', 'utf-8')

    xib = parser(xib, { xmlMode: true });
    xib = clearEmptyNodes(xib);

    navigate(xib);
    let baseSubView = subviews[0];

    generateUIDeclarations(baseSubView.content);
    console.log('----------------------------');
    
    genertaeConstraintsDeclarations(constraints[0].content);
    console.log('----------------------------');
    generateViewHierachy();
}

main()




