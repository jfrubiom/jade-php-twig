'use strict';

/**
  * @name jadeTwigPHP
  * @author juanpablocs
  * @description instance jade
  * @param jade
  * @return {void}
  */
var jadeTwigPHP =  function(jade){

  /**
   * _superNext
   * @description override de jade next
   */
  var _superNext = jade.Lexer.prototype.next;
  
  /**
   * regex_php_structure
   * @description captura estructura php $1(structure)
   */
  var regex_php_structure = /^{%(.*?)%}/;
  
  /**
   * regex_php_variable_valid
   * @description valida si dentro de la cadena existe apertura `{{`
   */
  var regex_php_variable_valid = /^(?:.+|){{(?:.+|)/;
  
  /**
   * validFilters
   * @return boolean
   */
  var validFilters = function(str){
    return /\|/.test(str);
  };

  /**
   * validDots
   * @param  {string} str 
   * @return boolean
   */
  var validDots = function(str){
    return /^(\w+|\$\w+)(\((.*?)\)|)\./.test(str);
  }

  /**
   * validFunction
   * @param  {string} str
   * @description valid aa() and $abc()
   * @return boolean
   */
  var validFunction = function(str){
    return /^(\w+|\$\w+)\((.*?)\)/.test(str);
  }

  /**
   * addSemicolon
   * @description si el ultimo caracter no es ; agregar semicolon
   *
   */
  var addSemicolon = function(str){
    var str = str.trim();
    var endChar = str.charAt(str.length-1);
    if(endChar==':')
      return str;
    if(endChar !==';')
      return str + ';';
    return str;
  };
  
  /**
   * addDollar
   * @description valid si es una funcion y retorna variable + dolar
   * @param {string} str
   */
  var addDollar = function(str){
    // add dollar
    if(str.charAt(0)!=='$')
      return '$' + str;
    return str;
  };

  /**
   * echoFormatPHP
   * @description remplaza {{ $test }} por <?php echo $test ?>
   */
  var echoFormatPHP = function(str){
    return str.replace(/\{\{(.*?)\}\}/g, function(zero,val){
      
      var val = val.trim();

      //valid filter constant
      if(validFilters(val)){
        var s = val.split('|');
        if(typeof s[1] == 'string' && s[1].toLowerCase().trim()=='const')
          return '<?php echo ' + addSemicolon(s[0]) + ' ?>';
      }

      // valid dots and conver to arrow
      if(validDots(val)){
        return '<?php echo ' + addDollar(addSemicolon(val.split('.').join('->')))+' ?>';
      }
      
      //valid function
      if(validFunction(val)){
        return '<?php echo ' + addSemicolon(val) + ' ?>';
      }

      return '<?php echo ' + addDollar(addSemicolon(val))  + ' ?>';
    });
  };
  

  /**
   * jade Lexer 
   * @description se inyecta nuevo metodo phpJadeInspiredTwig
   */
  jade.Lexer.prototype.phpJadeInspiredTwig = function(){
    var captureStructure = regex_php_structure.exec(this.input);
    if(captureStructure){
      this.consume(captureStructure[0].length);
      return this.tok('code', captureStructure[0]);
    }
    
    if(regex_php_variable_valid.exec(this.input)){
      this.input = echoFormatPHP(this.input);
      return jade.Lexer.prototype.attrs.call(this);
    }

  };
  
  /**
   * jade Lexer next
   * @description si el metodo inyectado no retorna nada.. siguiente metodo
   */
  jade.Lexer.prototype.next = function(){
    return this.phpJadeInspiredTwig() || _superNext.call(this);
  };
  
  /**
   * jade Compiler Visit code
   * @description override de el metodo visitcode
   *              existe una condicion para remplazar estructura
   *              despues continua el mismo funcionamiento en jade
   *
   */
  jade.Compiler.prototype.visitCode = function (code) {
    var captureStructure = regex_php_structure.exec(code.val);
    
    if(captureStructure){
      this.prettyIndent(1, true);
      this.buffer('<?php '+addSemicolon(captureStructure[1])+' ?>');
    }else{
      // Buffer code
      if (code.buffer) {
        var val = code.val.trim();
        val = 'null == (jade_interp = '+val+') ? "" : jade_interp';
        if (code.escape) val = 'jade.escape(' + val + ')';
        this.bufferExpression(val);
      } else {
        this.buf.push(code.val);
      }
    }
    // Block support
    if (code.block) {
      if (!code.buffer) this.buf.push('{');
      this.visit(code.block);
      if (!code.buffer) this.buf.push('}');
    }

  };

};

module.exports = jadeTwigPHP;