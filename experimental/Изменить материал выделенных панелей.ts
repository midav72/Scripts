class PanelInfo{
  panel: Panel;
  editorLeft: ValueEditor;
  editorRight: ValueEditor;
  thicknessDiff: number;
  
  constructor (p:Panel){
    this.panel = p;
    this.editorLeft = NewValueEditor(0);
    this.editorLeft.Visible = false;
    this.editorLeft.Text = '0';
    this.editorRight = NewValueEditor(0);
    this.editorRight.Visible = false;
    this.editorRight.Text = '0';
  }
}

class PanelsInfo extends Array<PanelInfo>{
}

function FindEditor(edit: ValueEditor){
  let found = false;
  let isLeft = false;
  for (let k = 0; k < panels.length; k++){
    let info = panels[k];
    if (info.editorLeft == edit){
      found = true;
      isLeft = true;
    }
    else if (info.editorRight == edit){
      found = true;
    }
    if (found){
      return {
        left: isLeft,
        panelInfo: info
      };
    }
  }
  return undefined;
}

function MakeInfo(){
  let autoExists: boolean = (transformer.TestVersion) && transformer.TestVersion() > 0; 
  for (let i = 0; i < panels.length; i++){
    let info = panels[i];
    let panel = info.panel;
    let thicknessDiff = ActiveMaterial.Thickness - panel.Thickness;
    info.thicknessDiff = thicknessDiff;
    transformer.AddPanelThicknessChange(panel, thicknessDiff);
    info.editorLeft.Visible = true;
    info.editorLeft.Readonly = false;
    info.editorRight.Visible = true;
    info.editorRight.Readonly = false;
    if (!autoExists){
      info.editorLeft.Value = -transformer.PanelShift[panel];
      info.editorRight.Value = thicknessDiff - info.editorLeft.Value;
    }
  }
  if (autoExists){
    transformer.Compute(true);
    for (let i = 0; i < panels.length; i++){
      let info = panels[i];
      info.editorLeft.Value = -transformer.PanelShift[info.panel];
      info.editorRight.Value = info.thicknessDiff - info.editorLeft.Value;
    }
  }
}

function ResetEditPos(info: PanelInfo){
  let panel = info.panel;
  localPosLeft.z = Model.DS.MillimetersInPixel() * (panel.Thickness - 50);
  var pos = panel.ToGlobal(localPosLeft);
  info.editorLeft.Position = Model.DS.ToScreen(pos)

  localPosRight.z = Model.DS.MillimetersInPixel() * (panel.Thickness + 50);
  pos = panel.ToGlobal(localPosRight);
  info.editorRight.Position = Model.DS.ToScreen(pos)
}

var transformer = NewModelTransformer();

/*second variant*/
var left, right;
var localPosLeft = NewVector(0, 0, 1);
var localPosRight = NewVector(0, 0, 1);
var panel;
Action.Continue();

var FinishSelecting = false;

NewButtonInput('Отменить').OnChange = ()=>{
  Action.Cancel;
}

NewButtonInput('Закончить').OnChange = () => {
  ApplyChanges();
  Action.Finish();
}

let panels = new PanelsInfo();

for (var i = 0; i < Model.SelectionCount; i ++){
    let panel = Model.Selections[i].AsPanel;
    if (panel){
      let newInfo = new PanelInfo(panel);
      panels.push(newInfo);
    }
}

let matInput = NewMaterialInput('Новый материал');
matInput.OnChange = ()=>{
  ActiveMaterial.Make(matInput.Name, matInput.Thickness);    
  Action.OnDraw = function () {
    for (let k = 0; k < panels.length; k++)
      ResetEditPos(panels[k]);
  }
  MakeInfo();
}

Action.OnValueChange = () => {
  let searchResult = FindEditor(Action.ActionValueEditor)
  let info = searchResult.panelInfo;
  let thicknessDiff = info.thicknessDiff;
  let left = info.editorLeft;
  let right = info.editorRight;
  let panel = info.panel;

  /*if (searchResult){
    let edit = ? info.editorLeft : info.editorRight;
  }*/
  if (searchResult.left) {
    if (thicknessDiff > 0) {
      if (left.Value < 0)
        left.Value = 0;
      if (left.Value > thicknessDiff)
        left.Value = thicknessDiff;
    }
    else {
      if (left.Value > 0)
        left.Value = 0;
      if (left.Value < thicknessDiff)
        left.Value = thicknessDiff;
    }

    transformer.PanelShift[panel] = - left.Value;
    right.Value = thicknessDiff - left.Value;
  }
  else {
    if (thicknessDiff > 0) {
      if (right.Value < 0)
        right.Value = 0;
      if (right.Value > thicknessDiff)
        right.Value = thicknessDiff;
    } else {
      if (right.Value > 0)
        right.Value = 0;
      if (right.Value < thicknessDiff)
        right.Value = thicknessDiff;
    }

    left.Value = thicknessDiff - right.Value;
    transformer.PanelShift[panel] = - left.Value;
  }
}

function ApplyChanges(){
  for (let i = 0; i < panels.length; i ++){
    panels[i].panel.MaterialName = ActiveMaterial.Name;
  }
  transformer.Apply(Undo);
  Action.Commit();
}