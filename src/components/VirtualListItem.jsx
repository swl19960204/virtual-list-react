import React, { createRef } from 'react';
import { EVENT_TYPE } from './VirtualList';
export class Item extends React.PureComponent {
    constructor(props) {
        super(props);
        this.$el = createRef(null);
    }
    componentWillMount() {
        this.shapeKey = this.props.horizontal ? 'offsetWidth' : 'offsetHeight';
    }
    componentDidMount() {
        if (typeof ResizeObserver !== 'undefined' && this.$el.current) {
            this.resizeObserver = new ResizeObserver(() => {
                this.dispatchSizeChange();
            }); this.resizeObserver.observe(this.$el.current);
        }
    }
    componentDidUpdate() {
        this.dispatchSizeChange();
    }
    componentWillUnmount() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect(); this.resizeObserver = null;
        }
    }
    dispatchSizeChange = () => {
        if (typeof this.props[EVENT_TYPE.ITEM] === 'function') {
            this.props[EVENT_TYPE.ITEM](this.props.uniqueKey, this.getCurrentSize());
        }
    };
    getCurrentSize = () => {
        return this.$el.current ? this.$el.current[this.shapeKey] : 0;
    };
    render() {
        const { tag, extraProps = {}, index, source, uniqueKey, renderComponent, style, className, } = this.props;
        const node = renderComponent(source, index);
        const props = {
            ...extraProps,
            index,
        };
        return React.createElement(tag, {
            ref: this.$el,
            key: uniqueKey,
            ...{
                role: 'listitem',
            },
            style,
            className,
        },
            React.cloneElement(node, { ...props }));
    }
}
export class Slot extends React.PureComponent {
    constructor(props) {
        super(props);
        this.$el = createRef(null);
    }
    componentWillMount() {
        this.shapeKey = this.props.horizontal ? 'offsetWidth' : 'offsetHeight';
    }
    componentDidMount() {
        if (typeof ResizeObserver !== 'undefined' && this.$el.current) {
            this.resizeObserver = new ResizeObserver(() => {
                this.dispatchSizeChange();
            });
            this.resizeObserver.observe(this.$el.current);
        }
    }
    componentDidUpdate() {
        this.dispatchSizeChange();
    }
    componentWillUnmount() {
        if (this.resizeObserver) { this.resizeObserver.disconnect(); this.resizeObserver = null; }
    }
    dispatchSizeChange = () => {
        if (typeof this.props[EVENT_TYPE.SLOT] === 'function') {
            this.props[EVENT_TYPE.SLOT](this.props.uniqueKey, this.getCurrentSize(), this.hasInitial);
        }
    };
    getCurrentSize = () => { return this.$el.current ? this.$el.current[this.shapeKey] : 0; };
    render() {
        const { tag, uniqueKey, style, className, childrenComp } = this.props;
        return React.createElement(tag, {
            ref: this.$el,
            key: uniqueKey,
            ...{ role: uniqueKey, },
            style,
            className,
        },
            // 扩展添加其它props     
            // React.cloneElement(childrenComp,{})   
            childrenComp);
    }
}
