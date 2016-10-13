/**
 * Created by northka.chen on 2016/10/11.
 */
(function ( global, factory) {
    if ( typeof module === "object" && typeof module.exports === "object" ) {
        module.exports = factory(global)
    }else{
        factory(global)
    }
})(typeof window !== "undefined" ? window : this, function( global ) {
    "use strict"
    var nextFrame = window.requestAnimationFrame	||
        window.webkitRequestAnimationFrame	||
        window.mozRequestAnimationFrame		||
        window.oRequestAnimationFrame		||
        window.msRequestAnimationFrame		||
        function (callback) { window.setTimeout(callback, 1000 / 60) }
    // 公共函数
    // ===================================================================================
    var util = (function() {
        var me = {}
        me.isAndroid = navigator.userAgent.indexOf('Android') > -1 || navigator.userAgent.indexOf('Adr') > -1
        me.block  = function(num, min, max){
            if(num < min ){
                return max
            }
            if(num > max){
                return min
            }
            return num
        }
        me.extend = function( target, obj ){
            for ( var i in obj ) {
                target[i] = obj[i]
            }
        }
        me.extend(me.ease = {}, {
            quadratic: {
                style: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                fn: function (k) {
                    return k * ( 2 - k )
                }
            },
            circular: {
                style: 'cubic-bezier(0.1, 0.57, 0.1, 1)',	// Not properly "circular" but this looks better, it should be (0.075, 0.82, 0.165, 1)
                fn: function (k) {
                    return Math.sqrt( 1 - ( --k * k ) )
                }
            },
            back: {
                style: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                fn: function (k) {
                    var b = 4
                    return ( k = k - 1 ) * k * ( ( b + 1 ) * k + b ) + 1
                }
            },
            bounce: {
                style: '',
                fn: function (k) {
                    if ( ( k /= 1 ) < ( 1 / 2.75 ) ) {
                        return 7.5625 * k * k
                    } else if ( k < ( 2 / 2.75 ) ) {
                        return 7.5625 * ( k -= ( 1.5 / 2.75 ) ) * k + 0.75
                    } else if ( k < ( 2.5 / 2.75 ) ) {
                        return 7.5625 * ( k -= ( 2.25 / 2.75 ) ) * k + 0.9375
                    } else {
                        return 7.5625 * ( k -= ( 2.625 / 2.75 ) ) * k + 0.984375
                    }
                }
            },
            elastic: {
                style: '',
                fn: function (k) {
                    var f = 0.22,
                        e = 0.4

                    if ( k === 0 ) { return 0 }
                    if ( k == 1 ) { return 1 }

                    return ( e * Math.pow( 2, - 10 * k ) * Math.sin( ( k - f / 4 ) * ( 2 * Math.PI ) / f ) + 1 )
                }
            }
        })
        return me
    }())

    // Slider构造函数
    // ===================================================================================
    function Slider(container, params) {
        if(!(this instanceof Slider)){
            return new Slider(container, params)
        }
        if( typeof $ == 'undefined'){
            throw new Error('this plugin need zepto or Jquery')
        }

        //用户可配置参数
        this._container = $(container)
        this._opt = {
            mode        : 'horizontal',
            indexChange : null,
            easing      : 'circular',
            duration    : 300,
            autoplay    : true,
            autoTime    : 3000
        }
        util.extend(this._opt, params)

        //运行时Slider状态
        this._status = {
            touching         : false,
            animating        : false,
            index            : 0,
            startX           : 0,
            startY           : 0,
            currentX         : 0,
            currentY         : 0,
            diff             : 0,
            abs              : 0,
            startPosition    : null,
            containerWidth   : this._container.width(),
            containerHeight  : this._container.height(),
            childHeight      : this._container.children().height(),
            childLength      : this._container.children().length,
            childrenPosition : []
        }

        this.__initStyle()
        this.__initEvent()
        this._opt.autoplay && (this.__autoplay())
    }
    // ===================================================================================
    // Slider 方法
    // prev               ：向前翻页
    // next               ：向后翻页
    // getComputedStyle   ：获得当前页面滚动位置
    // indexChange        ：添加页数改变监听函数
    // setIndex           : 滚动到某页
    // __changeIndex :    ：实现翻页功能
    // __modifyIndex      ：修改页数
    // __autoplay         ：自动播放函数
    // __initEvent        ：监听事件绑定
    // __handleTouchStart ：监听触摸触摸事件开始
    // __handleTouchMove  ：监听触摸事件滑动
    // __handleTouchEnd   ：监听触摸事件结束
    // __reset            ：复位到当前页面
    // __animate          ：页面滑动动画
    // ===================================================================================
    Slider.prototype = {
        prev               : function () {
           this.__changeIndex(-1)
        },
        next               : function () {
            this.__changeIndex(1)
        },
        getComputedStyle   : function () {
            var matrix = this._container.css('transform').split(')')[0].split(', ')
            var x = +(matrix[12] || matrix[4])
            var y = +(matrix[13] || matrix[5])
            return {
                x: x,
                y: y
            }
        },
        indexChange        : function ( func ) {
            this._opt.indexChange = func
        },
        setIndex           : function ( index ) {
            var offset = index - this._status.index
            this.__changeIndex(offset)
        },
        __changeIndex      : function ( offset ) {
            var position = this.getComputedStyle(),
                self     = this
            function callBack() {
                self.__modifyIndex(offset)
            }
            if(this._opt.mode == 'vertical'){
                var index = util.block( this._status.index + offset, 0, this._status.childLength-1),
                    destY = -this._status.childrenPosition[index].y
                    offset = index - this._status.index
                this.__animate(position.x, position.y, 0,destY, this._opt.duration, callBack)
            }else{
                var index = util.block(this._status.index + offset, 0 , this._status.childLength-1),
                    destX = -this._status.childrenPosition[index].x
                    offset = index - this._status.index
                this.__animate(position.x, position.y, destX, 0, this._opt.duration, callBack)
            }
        },
        __modifyIndex      : function ( offset ) {
            this._status.index += offset
            this._opt.indexChange && this._opt.indexChange.call(this, this._status.index)
        },
        __autoplay         : function () {
            var self = this
            setInterval(function () {
                self.next()
            },this._opt.autoTime)
        },
        __initStyle        : function () {
            var self = this
            if(this._opt.mode === 'vertical'){
                var childHeight     = this._status.childHeight,
                    topOffset       = 0
                this._container.css({
                    position        : 'relative',
                    width           : '100%',
                    height          : childHeight,
                    transform       : 'translate3d(0,0,0)',
                    webkitTransform : 'translate3d(0,0,0)'
                })
                this._container.children().each(function (index, child) {
                    var $child = $(child)
                    $child.css({
                        position : 'absolute',
                        width    : '100%',
                        left     : '0',
                        top      : topOffset
                    })
                    self._status.childrenPosition.push({
                        x : 0,
                        y : topOffset
                    })
                    topOffset += childHeight
                })
            }else{
                var containerWidth = this._status.containerWidth,
                    childHeight    = this._status.childHeight,
                    leftOffset     = 0

                this._container.css({
                    position        : 'relative',
                    width           : '100%',
                    height          : childHeight,
                    transform       : 'translate3d(0,0,0)',
                    webkitTransform : 'translate3d(0,0,0)'
                })
                this._container.children().each(function (index, child) {
                    var $child = $(child)
                    $child.css({
                        position : 'absolute',
                        width    : '100%',
                        top      : '0',
                        left     : leftOffset
                    })
                    self._status.childrenPosition.push({
                        x : leftOffset,
                        y : 0
                    })
                    leftOffset += containerWidth
                })
            }
        },
        __initEvent        : function () {
            this._container.on('touchstart.slider', this.__handleTouchStart.bind(this))
            this._container.on('touchmove.slider',  this.__handleTouchMove.bind(this))
            this._container.on('touchend.slider canceltouch.slider',   this.__handleTouchEnd.bind(this))
        },
        __handleTouchStart : function ( e ) {
            var position  = this.getComputedStyle(),
                startTouch = {
                touching      : true,
                startX        : e.touches[0].clientX,
                startY        : e.touches[0].clientY,
                startPosition : position
            }
            util.extend(this._status, startTouch)
        },
        __handleTouchMove  : function ( e ) {
            //android下bug兼容
            util.isAndroid && e.preventDefault()
            var moveTouch = {
                    currentX : e.touches[0].clientX,
                    currentY : e.touches[0].clientY
                },
                destX = 0,
                destY = 0
            util.extend(this._status, moveTouch)

            if(this._opt.mode == 'vertical'){
                destY = this._status.startPosition.y + moveTouch.currentY - this._status.startY
            }else{
                destX = this._status.startPosition.x + moveTouch.currentX - this._status.startX
            }
            this._container.css({
                transform       : 'translate3d(' + destX + 'px,' + destY +'px, 0)',
                webkitTransform : 'translate3d(' + destX + 'px,' + destY +'px, 0)'
            })

        },
        __handleTouchEnd   : function ( e ) {
            var endTouch = {
                    touching : false,
                    currentX : e.changedTouches[0].clientX,
                    currentY : e.changedTouches[0].clientY
                },
                offset
            util.extend(this._status, endTouch)
                if(this._opt.mode == 'vertical'){
                    offset = endTouch.currentY - this._status.startY
                }else{
                    offset = endTouch.currentX - this._status.startX
                }
                if( Math.abs(offset) > 50){
                    if(offset > 0){
                        this.prev()
                    }else{
                        this.next()
                    }
                }else{
                    this.__reset()
                }
        },
        __reset            : function () {
            var index         = this._status.index,
                childPosition = this._status.childrenPosition[index],
                position      = this.getComputedStyle()
            this.__animate(position.x, position.y, -childPosition.x, -childPosition.y, this._opt.duration)
        },
        __animate          : function ( startX, startY, destX, destY, duration, callback ) {
            var self       = this,
                startTime  = Date.now(),
                callbacked = false

            if (self._status.animating) return
            self._status.animating = true
            function animate(){
                var now = Date.now(),
                    newX, newY,
                    k = (now - startTime)/duration
                if(now > startTime + duration){
                    self._status.animating = false
                    self._container.css({
                        transform       :'translate3d('+destX+'px,'+destY+'px,0)',
                        webkitTransform :'translate3d('+destX+'px,'+destY+'px,0)'
                    })
                    if( !callbacked && typeof callback != 'undefined'){
                        callback.call(this)
                    }
                    return
                }
                if( self._status.touching ){
                    self._status.animating = false
                    return
                }

                newX = (destX - startX) * util.ease[self._opt.easing].fn(k) + startX
                newY = (destY - startY) * util.ease[self._opt.easing].fn(k) + startY
                self._container.css({
                    transform       :'translate3d('+newX+'px,'+newY+'px,0)',
                    webkitTransform :'translate3d('+newX+'px,'+newY+'px,0)'
                })
                if(self._status.animating) nextFrame(animate)
            }
            animate()
        }
    }

    var globalOld = global.Slider
    global.Slider = Slider
    var jqOld = $.fn.Slider
    $.fn.Slider = Slider
    global.Slider.noConflict = function (deep) {
        global.Slider = globalOld
        deep && ($.fn.Slider = jqOld)
        return this
    }
})
