var WIDTH = 800;
var HEIGHT = 500;
var MARGIN = 80;
var BOX_SIZE = 70;
var BOX_BORDER_WIDTH = 4;
var BOX_MIN_SIZE = 15;

var svg = d3.select("#visualization-area")
    .append("svg")
    .attr("width", WIDTH)
    .attr("height", HEIGHT)
    .attr("id", "visualization-svg");

var timeScale, valueScale, stocks, generatePathCoords;

d3.csv("data/data_06-08.csv", function(error, data) {
    if (error) {
        console.log(error);
    } else {
        // convert stock data into a format that is easy to visualize
        stocks = data.columns;
        stocks.shift(); // remove "date" column

        stocks = stocks.map(function(stock_name) {
            return data.map(function (d) {
                return {
                    date: new Date(d.date),
                    value: Number(d[stock_name])
                };
            });
        });

        // create time scale and value scale to map raw data to screen positions
        timeScale = d3.scaleTime()
            .domain([
                new Date(stocks[0][0].date),
                new Date(stocks[0][stocks[0].length - 1].date)
            ])
            .range([MARGIN, WIDTH - MARGIN]);

        var maxStockValue = d3.max(stocks, function(stock) {
            return d3.max(stock, function(d) {
                return d.value;
            });
        });

        valueScale = d3.scaleLinear()
            .domain([0, maxStockValue])
            .range([HEIGHT - MARGIN, MARGIN]);

        // create and display SVG paths for all the stocks
        generatePathCoords = d3.line()
            .x(function(d) { return timeScale(d.date); })
            .y(function(d) { return valueScale(d.value); });

        var lines = svg.selectAll(".stock-line")
            .data(stocks);

        lines.enter().append("path")
            .attr("d", generatePathCoords)
            .attr("stroke", "black")
            .attr("stroke-width", 1)
            .attr("fill", "none")
            .attr("class", "stock-line");

        svg.on("click", create_filter_box);
    }
});

// add trash bin
svg.append("image")
    .attr("x", WIDTH - MARGIN * .9)
    .attr("y", HEIGHT - MARGIN * .9)
    .attr("width", MARGIN * .8)
    .attr("height", MARGIN * .8)
    .attr("xlink:href", "images/trash.svg");

function create_filter_box() {
    x_pos = d3.mouse(svg.node())[0];
    y_pos = d3.mouse(svg.node())[1];

    box_group = svg.append("g")

    box_group.append("rect")
        .attr("x", x_pos)
        .attr("y", y_pos)
        .attr("width", BOX_SIZE)
        .attr("height", BOX_SIZE)
        .attr("class", "filter-box-inside")
        .style("fill", "rgba(0, 0, 0, .3)")
        .style("stroke", "none")
        .call(d3.drag().on("drag", on_drag)
                       .on("end", on_drag_end));

    box_group.append("rect")
        .attr("x", x_pos)
        .attr("y", y_pos)
        .attr("width", BOX_SIZE)
        .attr("height", BOX_SIZE)
        .attr("class", "filter-box-outside")
        .style("fill", "none")
        .style("stroke", "rgba(0, 0, 255, .5)")
        .style("stroke-width", BOX_BORDER_WIDTH)
        .call(d3.drag().on("drag", on_resize)
                       .on("start", on_resize_start));

    update_lines();
}

function on_drag() {
    var x_pos = Number(d3.select(this).attr("x")) + d3.event.dx;
    var y_pos = Number(d3.select(this).attr("y")) + d3.event.dy;

    d3.select(this)
        .attr("x", x_pos)
        .attr("y", y_pos);
    d3.select(this.parentNode).select(".filter-box-outside")
        .attr("x", x_pos)
        .attr("y", y_pos);

    update_lines();
}

function on_drag_end() {
    if (d3.mouse(svg.node())[0] > WIDTH - MARGIN * .9 &&
        d3.mouse(svg.node())[1] > HEIGHT - MARGIN * .9) {
        d3.select(this.parentNode).remove();
    }

    update_lines();
}

var resizeLeft, resizeRight, resizeTop, resizeBottom;

function on_resize_start() {
    resizeLeft = false;
    resizeRight = false;
    resizeTop = false;
    resizeBottom = false;

    var mouse_x = d3.mouse(svg.node())[0];
    var mouse_y = d3.mouse(svg.node())[1];

    var box_left_x = Number(d3.select(this).attr("x"));
    var box_right_x = box_left_x + Number(d3.select(this).attr("width"));
    var box_top_y = Number(d3.select(this).attr("y"));
    var box_bottom_y = box_top_y + Number(d3.select(this).attr("height"));

    if (mouse_x < box_left_x + BOX_BORDER_WIDTH) {
        resizeLeft = true;
    } else if (mouse_x > box_right_x - BOX_BORDER_WIDTH) {
        resizeRight = true;
    }

    if (mouse_y < box_top_y + BOX_BORDER_WIDTH) {
        resizeTop = true;
    } else if (mouse_y > box_bottom_y - BOX_BORDER_WIDTH) {
        resizeBottom = true;
    }
}

function on_resize() {
    var x = Number(d3.select(this).attr("x"));
    var y = Number(d3.select(this).attr("y"));
    var width = Number(d3.select(this).attr("width"));
    var height = Number(d3.select(this).attr("height"));    

    if (resizeLeft) {
        width -= d3.event.dx;
        if (width < BOX_MIN_SIZE) {
            width += d3.event.dx;
        } else {
            x += d3.event.dx;
        }
    }
    if (resizeRight) {
        width += d3.event.dx;
        if (width < BOX_MIN_SIZE) {
            width -= d3.event.dx;
        }
    }
    if (resizeTop) {
        height -= d3.event.dy;
        if (height < BOX_MIN_SIZE) {
            height += d3.event.dy;
        } else {
            y += d3.event.dy;
        }
    }
    if (resizeBottom) {
        height += d3.event.dy;
        if (height < BOX_MIN_SIZE) {
            height -= d3.event.dy;
        }
    }

    d3.select(this)
        .attr("x", x)
        .attr("y", y)
        .attr("width", width)
        .attr("height", height);
    d3.select(this.parentNode).select(".filter-box-inside")
        .attr("x", x)
        .attr("y", y)
        .attr("width", width)
        .attr("height", height);

    update_lines();
}

function filter_stocks(stocks) {
    filter_boxes = d3.selectAll(".filter-box-inside");

    var filtered_stocks = stocks;

    filter_boxes.each(function() {
        var box = d3.select(this);

        // determine the date-range and value-range for this filter box
        var box_x = Number(box.attr("x"));
        var box_y = Number(box.attr("y"));
        var box_width = Number(box.attr("width"));
        var box_height = Number(box.attr("height"));

        var start_time = timeScale.invert(box_x);
        var end_time = timeScale.invert(box_x + box_width);

        var max_value = valueScale.invert(box_y);
        var min_value = valueScale.invert(box_y + box_height);

        filtered_stocks = filtered_stocks.filter(function(stock) {
            // find all the stock values within the specific date range
            var filtered_values = stock.filter(function(d) {
                return d.date >= start_time && d.date <= end_time;
            });

            // determine whether the values fall within the value range
            return d3.max(filtered_values, d => d.value) <= max_value &&
                   d3.min(filtered_values, d => d.value) >= min_value;
        });
    });

    return filtered_stocks;
}

function update_lines() {
    var lines = d3.select("#visualization-svg").selectAll(".stock-line")
        .data(filter_stocks(stocks));

    lines.enter().append("path")
        .attr("d", generatePathCoords)
        .attr("stroke", "black")
        .attr("stroke-width", 1)
        .attr("fill", "none")
        .attr("class", "stock-line");

    lines.exit().remove();

    lines.attr("d", generatePathCoords)
        .attr("stroke", "black")
        .attr("stroke-width", 1)
        .attr("fill", "none")
        .attr("class", "stock-line");
}
