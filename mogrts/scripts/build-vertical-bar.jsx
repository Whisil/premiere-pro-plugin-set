/* MoneyMoves Vertical Bar MOGRT generator for After Effects 24.3+. */
(function buildMoneyMovesVerticalBar() {
    var nonInteractive = $.getenv("MONEYMOVES_NONINTERACTIVE") === "1";

    function report(message) {
        if (nonInteractive) {
            $.writeln(message);
        } else {
            alert(message);
        }
    }

    app.beginUndoGroup("Build MoneyMoves Vertical Bar");
    try {
        if (!app.project) app.newProject();

        var outputRoot = $.getenv("MONEYMOVES_MOGRT_OUTPUT");
        if (!outputRoot) outputRoot = Folder.myDocuments.fsName + "/MoneyMoves MOGRTs";
        var outputFolder = new Folder(outputRoot);
        if (!outputFolder.exists && !outputFolder.create()) {
            throw new Error("Could not create output folder: " + outputRoot);
        }

        var width = 1920;
        var height = 1080;
        var duration = 6;
        var fps = 30;
        var comp = app.project.items.addComp("MM Vertical Bar v1", width, height, 1, duration, fps);
        comp.motionGraphicsTemplateName = "MoneyMoves Vertical Bar v1";

        var background = comp.layers.addSolid([0.043, 0.043, 0.439], "Background", width, height, 1, duration);
        background.moveToEnd();

        var controls = comp.layers.addNull(duration);
        controls.name = "EDIT — MoneyMoves Chart";
        controls.guideLayer = true;

        function slider(name, value) {
            var effect = controls.property("ADBE Effect Parade").addProperty("ADBE Slider Control");
            effect.name = name;
            effect.property(1).setValue(value);
            effect.property(1).addToMotionGraphicsTemplateAs(comp, name);
            return effect;
        }

        function color(name, value) {
            var effect = controls.property("ADBE Effect Parade").addProperty("ADBE Color Control");
            effect.name = name;
            effect.property(1).setValue(value);
            effect.property(1).addToMotionGraphicsTemplateAs(comp, name);
            return effect;
        }

        function textControl(name, value) {
            // Text Control is not an addable After Effects effect. Source Text is
            // a native Essential Graphics property, so retain the editable value
            // in a guide layer and expose that property directly to the MOGRT.
            var layer = comp.layers.addText(value);
            layer.name = "EDIT TEXT — " + name;
            layer.guideLayer = true;
            layer.shy = true;
            var sourceText = layer.property("ADBE Text Properties").property("ADBE Text Document");
            sourceText.addToMotionGraphicsTemplateAs(comp, name);
            return "thisComp.layer('" + layer.name + "').text.sourceText";
        }

        slider("Item Count", 5);
        slider("Animation Duration", 1.2);
        slider("Maximum Value", 100);
        slider("Decimal Places", 0);
        var titleText = textControl("Title", "MONEY MOVES");
        var subtitleText = textControl("Subtitle", "EDIT DATA IN PROPERTIES");
        var prefixText = textControl("Prefix", "");
        var suffixText = textControl("Suffix", "%");
        color("Accent Color", [1.0, 0.141, 0.282, 1]);
        color("Text Color", [1.0, 0.965, 0.847, 1]);
        color("Background Color", [0.043, 0.043, 0.439, 1]);

        var i;
        var labelText = [];
        for (i = 1; i <= 12; i += 1) {
            slider("Value " + i, i <= 5 ? [72, 48, 91, 64, 83][i - 1] : 50);
            labelText[i] = textControl("Label " + i, "ITEM " + i);
        }

        background.property("ADBE Transform Group").property("ADBE Opacity").setValue(100);
        background.property("ADBE Effect Parade").addProperty("ADBE Fill").property("ADBE Fill-0002").expression =
            "thisComp.layer('EDIT — MoneyMoves Chart').effect('Background Color')('Color')";

        function addTextLayer(name, sourceExpression, position, size, font) {
            var layer = comp.layers.addText(name);
            layer.name = name;
            var textProp = layer.property("ADBE Text Properties").property("ADBE Text Document");
            var doc = textProp.value;
            doc.font = font;
            doc.fontSize = size;
            doc.fillColor = [1.0, 0.965, 0.847];
            doc.applyFill = true;
            doc.applyStroke = false;
            textProp.setValue(doc);
            textProp.expression = sourceExpression;
            layer.property("ADBE Transform Group").property("ADBE Position").setValue(position);
            layer.property("ADBE Effect Parade").addProperty("ADBE Fill").property("ADBE Fill-0002").expression =
                "thisComp.layer('EDIT — MoneyMoves Chart').effect('Text Color')('Color')";
            return layer;
        }

        addTextLayer(
            "Title",
            titleText,
            [120, 105],
            64,
            "PeaceSans"
        );
        addTextLayer(
            "Subtitle",
            subtitleText,
            [122, 170],
            24,
            "LTSuperiorMono-Regular"
        );

        for (i = 1; i <= 12; i += 1) {
            var x = 150 + (i - 1) * 140;
            var chartBottom = 850;
            var bar = comp.layers.addShape();
            bar.name = "Bar " + i;
            var contents = bar.property("ADBE Root Vectors Group");
            var rectangle = contents.addProperty("ADBE Vector Shape - Rect");
            rectangle.property("ADBE Vector Rect Size").setValue([92, 500]);
            rectangle.property("ADBE Vector Rect Position").setValue([0, -250]);
            var fill = contents.addProperty("ADBE Vector Graphic - Fill");
            fill.property("ADBE Vector Fill Color").expression =
                "thisComp.layer('EDIT — MoneyMoves Chart').effect('Accent Color')('Color')";
            bar.property("ADBE Transform Group").property("ADBE Position").setValue([x, chartBottom]);
            bar.property("ADBE Transform Group").property("ADBE Scale").expression =
                "c=thisComp.layer('EDIT — MoneyMoves Chart');" +
                "n=Math.floor(clamp(c.effect('Item Count')('Slider'),1,12));" +
                "v=Math.max(0,c.effect('Value " + i + "')('Slider'));" +
                "m=Math.max(0.001,c.effect('Maximum Value')('Slider'));" +
                "d=Math.max(0.05,c.effect('Animation Duration')('Slider'));" +
                "p=ease(Math.min(time,d),0,d,0,Math.min(v/m,1));" +
                "[100,p*100]";
            bar.property("ADBE Transform Group").property("ADBE Opacity").expression =
                "Math.floor(thisComp.layer('EDIT — MoneyMoves Chart').effect('Item Count')('Slider')) >= " + i + " ? 100 : 0";

            var label = addTextLayer(
                "Label " + i,
                labelText[i],
                [x - 40, 900],
                20,
                "LTSuperiorMono-Regular"
            );
            label.property("ADBE Transform Group").property("ADBE Opacity").expression =
                "Math.floor(thisComp.layer('EDIT — MoneyMoves Chart').effect('Item Count')('Slider')) >= " + i + " ? 100 : 0";

            var valueLabel = addTextLayer(
                "Value Label " + i,
                "c=thisComp.layer('EDIT — MoneyMoves Chart');" +
                "p=" + prefixText + ".toString();s=" + suffixText + ".toString();" +
                "d=Math.floor(clamp(c.effect('Decimal Places')('Slider'),0,3));" +
                "p+c.effect('Value " + i + "')('Slider').value.toFixed(d)+s",
                [x - 35, 290],
                24,
                "LTSuperiorMono-Semibold"
            );
            valueLabel.property("ADBE Transform Group").property("ADBE Opacity").expression =
                "Math.floor(thisComp.layer('EDIT — MoneyMoves Chart').effect('Item Count')('Slider')) >= " + i + " ? 100 : 0";
        }

        var projectFile = new File(outputFolder.fsName + "/MoneyMoves-Vertical-Bar-v1.aep");
        app.project.save(projectFile);
        if (!comp.exportAsMotionGraphicsTemplate(true, outputFolder.fsName)) {
            throw new Error("After Effects did not export the Motion Graphics template.");
        }
        report("MoneyMoves Vertical Bar created in:\n" + outputFolder.fsName);
    } catch (error) {
        report("MoneyMoves MOGRT build failed:\n" + error.toString());
        throw error;
    } finally {
        app.endUndoGroup();
    }
}());
