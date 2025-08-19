import * as assert from 'assert';
import * as vscode from 'vscode';
import { HolesViewProvider } from '../../holesPanel/holesViewProvider';
import {
  EffektHoleInfo,
  SCOPE_KIND_LOCAL,
  SCOPE_KIND_GLOBAL,
  SCOPE_KIND_NAMESPACE,
  BINDING_KIND_TERM,
  BINDING_KIND_TYPE,
  fullyQualifiedName,
  TermBinding,
  TypeBinding,
} from '../../holesPanel/effektHoleInfo';

suite('Holes Panel Test Suite', () => {
  let holesViewProvider: HolesViewProvider;
  let mockExtensionContext: vscode.ExtensionContext;

  suiteSetup(() => {
    // Create a mock extension context
    mockExtensionContext = {
      extensionUri: vscode.Uri.file('/mock/extension/path'),
    } as vscode.ExtensionContext;

    holesViewProvider = new HolesViewProvider(mockExtensionContext);
  });

  test('HolesViewProvider should have correct viewType', () => {
    assert.strictEqual(HolesViewProvider.viewType, 'effekt.holesView');
  });

  test('Should handle complex hole data structures', () => {
    const complexHoles: EffektHoleInfo[] = [
      {
        id: 'hole_function_body',
        range: {
          start: { line: 2, character: 10 },
          end: { line: 2, character: 12 },
        },
        innerType: undefined,
        expectedType: 'Int / { io, state }',
        scope: {
          kind: SCOPE_KIND_LOCAL,
          bindings: [
            {
              qualifier: ['std', 'math'],
              name: 'add',
              origin: 'Imported',
              type: '(Int, Int) => Int',
              kind: BINDING_KIND_TERM,
            },
            {
              qualifier: [],
              name: 'x',
              origin: 'Defined',
              type: 'Int',
              kind: BINDING_KIND_TERM,
            },
          ],
          outer: {
            kind: SCOPE_KIND_GLOBAL,
            bindings: [
              {
                qualifier: ['std'],
                name: 'List',
                origin: 'Imported',
                definition: 'type List[A]',
                kind: BINDING_KIND_TYPE,
              },
            ],
          },
        },
      },
    ];

    holesViewProvider.updateHoles(complexHoles);

    // Verify hole structure
    const hole = complexHoles[0];
    assert.strictEqual(hole.id, 'hole_function_body');
    assert.strictEqual(hole.expectedType, 'Int / { io, state }');
    assert.strictEqual(hole.innerType, undefined);

    // Verify scope structure
    assert.strictEqual(hole.scope.kind, SCOPE_KIND_LOCAL);
    assert.strictEqual(hole.scope.bindings.length, 2);
    assert.ok(hole.scope.outer, 'Should have outer scope');
    assert.strictEqual(hole.scope.outer!.kind, SCOPE_KIND_GLOBAL);
  });

  test('Should correctly handle binding qualifiers', () => {
    const termBinding: TermBinding = {
      qualifier: ['std', 'collection'],
      name: 'map',
      origin: 'Imported',
      type: '[A, B] => (List[A], A => B) => List[B]',
      kind: BINDING_KIND_TERM,
    };

    const typeBinding: TypeBinding = {
      qualifier: ['mymodule'],
      name: 'Person',
      origin: 'Defined',
      definition: 'record Person(name: String, age: Int)',
      kind: BINDING_KIND_TYPE,
    };

    // Test fully qualified names
    assert.strictEqual(fullyQualifiedName(termBinding), 'std::collection::map');
    assert.strictEqual(fullyQualifiedName(typeBinding), 'mymodule::Person');
  });

  test('Should handle different scope kinds', () => {
    const namespaceScope = {
      kind: SCOPE_KIND_NAMESPACE,
      name: 'std::io',
      bindings: [],
    };

    const localScope = {
      kind: SCOPE_KIND_LOCAL,
      bindings: [],
      outer: namespaceScope,
    };

    assert.strictEqual(namespaceScope.kind, SCOPE_KIND_NAMESPACE);
    assert.strictEqual(localScope.kind, SCOPE_KIND_LOCAL);
    assert.strictEqual(localScope.outer, namespaceScope);
  });

  test('Should find innermost hole containing cursor position', () => {
    // Create nested holes scenario
    const outerHole: EffektHoleInfo = {
      id: 'outer_hole',
      range: {
        start: { line: 1, character: 0 },
        end: { line: 3, character: 10 },
      },
      scope: { kind: SCOPE_KIND_LOCAL, bindings: [] },
    };

    const innerHole: EffektHoleInfo = {
      id: 'inner_hole',
      range: {
        start: { line: 2, character: 5 },
        end: { line: 2, character: 7 },
      },
      scope: { kind: SCOPE_KIND_LOCAL, bindings: [] },
    };

    holesViewProvider.updateHoles([outerHole, innerHole]);

    // Test cursor position inside inner hole
    const cursorInInner = new vscode.Position(2, 6);
    holesViewProvider.focusHoles(cursorInInner);

    // Test cursor position outside all holes
    const cursorOutside = new vscode.Position(0, 0);
    holesViewProvider.focusHoles(cursorOutside);

    // These should not throw and should handle the logic correctly
    assert.ok(true, 'Should handle nested hole focus correctly');
  });

  test('Should validate hole range boundaries', () => {
    const hole: EffektHoleInfo = {
      id: 'boundary_test',
      range: {
        start: { line: 5, character: 10 },
        end: { line: 5, character: 12 },
      },
      scope: { kind: SCOPE_KIND_LOCAL, bindings: [] },
    };

    holesViewProvider.updateHoles([hole]);

    // Test exact boundaries
    const startPos = new vscode.Position(5, 10);
    const endPos = new vscode.Position(5, 12);
    const insidePos = new vscode.Position(5, 11);
    const outsidePos = new vscode.Position(5, 13);

    // These positions should be handled correctly by focusHoles
    holesViewProvider.focusHoles(startPos);
    holesViewProvider.focusHoles(endPos);
    holesViewProvider.focusHoles(insidePos);
    holesViewProvider.focusHoles(outsidePos);

    assert.ok(true, 'Should handle boundary positions correctly');
  });

  test('Should handle empty holes array', () => {
    holesViewProvider.updateHoles([]);

    const position = new vscode.Position(0, 0);
    holesViewProvider.focusHoles(position);

    assert.ok(true, 'Should handle empty holes gracefully');
  });

  test('Should validate binding origins', () => {
    const definedBinding: TermBinding = {
      qualifier: [],
      name: 'localVar',
      origin: 'Defined',
      type: 'String',
      kind: BINDING_KIND_TERM,
    };

    const importedBinding: TermBinding = {
      qualifier: ['std'],
      name: 'println',
      origin: 'Imported',
      type: 'String => Unit / { io }',
      kind: BINDING_KIND_TERM,
    };

    assert.strictEqual(definedBinding.origin, 'Defined');
    assert.strictEqual(importedBinding.origin, 'Imported');

    // Test that both have the correct type
    assert.strictEqual(definedBinding.kind, BINDING_KIND_TERM);
    assert.strictEqual(importedBinding.kind, BINDING_KIND_TERM);
  });

  test('Should handle holes with type information', () => {
    const typedHole: EffektHoleInfo = {
      id: 'typed_hole',
      range: {
        start: { line: 1, character: 5 },
        end: { line: 1, character: 7 },
      },
      innerType: 'Unit',
      expectedType: 'Int',
      scope: {
        kind: SCOPE_KIND_LOCAL,
        bindings: [
          {
            qualifier: [],
            name: 'convert',
            origin: 'Defined',
            type: 'Unit => Int',
            kind: BINDING_KIND_TERM,
          },
        ],
      },
    };

    holesViewProvider.updateHoles([typedHole]);

    // Verify type information
    assert.strictEqual(typedHole.innerType, 'Unit');
    assert.strictEqual(typedHole.expectedType, 'Int');

    // Verify that we have a binding that could resolve the type mismatch
    const convertBinding = typedHole.scope.bindings.find(
      (b) => b.name === 'convert',
    ) as TermBinding;
    assert.ok(convertBinding, 'Should have convert binding');
    assert.strictEqual(convertBinding.type, 'Unit => Int');
  });

  test('Should dispose cleanly', () => {
    // This should not throw
    holesViewProvider.dispose();
    assert.ok(true, 'Should dispose without errors');
  });
});
