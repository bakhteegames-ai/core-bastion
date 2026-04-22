import * as pc from 'playcanvas';

const GROUP_DEFINITIONS = [
  ['structural', 'Structural'],
  ['landmarks', 'Landmarks'],
  ['buildSlots', 'BuildSlots'],
  ['pathMarkers', 'PathMarkers'],
  ['propsMedium', 'PropsMedium'],
  ['propsSmall', 'PropsSmall'],
  ['fx', 'FX'],
  ['lighting', 'Lighting']
];

export function createBattlefieldAssembly(sceneRoot) {
  const sceneGroups = {};

  GROUP_DEFINITIONS.forEach(([key, name]) => {
    const group = new pc.Entity(name);
    group.setLocalPosition(0, 0, 0);
    group.setLocalEulerAngles(0, 0, 0);
    group.setLocalScale(1, 1, 1);
    sceneRoot.addChild(group);
    sceneGroups[key] = group;
  });

  return sceneGroups;
}
