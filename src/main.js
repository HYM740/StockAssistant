if(StockAssistant === undefined)
{
	var StockAssistant = {};
}

StockAssistant.name = 'Stock Assistant';

StockAssistant.launch = function()
{
	const modeName = {
		0 : 'Stable',
		1 : 'Slow Rise',
		2 : 'Slow Fall',
		3 : 'Fast Rise',
		4 : 'Fast Fall',
		5 : 'Caostic'
	};
	function getModeName(mode)
	{
		return loc(modeName[mode]);
	}

	let loadData = {
		goods : []
	};

	StockAssistant.stockData = {
		level : 0,
		goods : [],
	};

	//////////////////////////////////////////////////
	// public method
	//////////////////////////////////////////////////

	StockAssistant.init = async function ()
	{
		let isWait = true;

		do {
			if (Game.Objects['Bank'].minigameLoaded)
			{
				isWait = false;
			}
			else
			{
				await new Promise(resolve => setTimeout(resolve, 1000));
			}
		} while (isWait);

		StockAssistant.stockMarket = Game.Objects['Bank'].minigame;

		StockAssistant.stockData.level = StockAssistant.stockMarket.parent.level;

		// Tick時間変更ボタン追加
		let sptList = [1,10,30,60];
		let sptStr = '<div style="display: inline-block;"><span class="bankSymbol">' + loc('change the seconds per tick') + '</span>';
		sptList.forEach(spt => sptStr += '<div class="bankButton bankButtonBuy" id="bankSecondsPerTick_' + spt + '">' + spt + '</div>');
		sptStr += '</div>';
		l('bankNextTick').insertAdjacentHTML('afterend', sptStr);
		sptList.forEach(spt => {
			AddEvent(l('bankSecondsPerTick_' + spt),'click',function(spt){return function(e){StockAssistant.stockMarket.secondsPerTick=spt;}}(spt));
		});

		for (let idx = 0; idx < StockAssistant.stockMarket.goodsById.length; ++idx)
		{
			let good = StockAssistant.stockMarket.goodsById[idx];
			let parent = good.l.firstChild;
			let keyRestingVal = 'bankGood-' + idx + '-restingVal';
			let keyMinVal = 'bankGood-' + idx + '-minVal';
			let keyMaxVal = 'bankGood-' + idx + '-maxVal';
			let keyBoughtVal =  'bankGood-' + idx + '-boughtVal';
			let keyMode = 'bankGood-' + idx + '-mode';
			let keyDur = 'bankGood-' + idx + '-dur';

			let boughtVal = 0;
			let stock = 0;
			let min = 0;
			let max = 0;

			// ロードデータあれば使用する
			if (loadData.goods[idx])
			{
				boughtVal = loadData.goods[idx].boughtVal;
				stock = loadData.goods[idx].stock;
				min = loadData.goods[idx].min;
				max = loadData.goods[idx].max;
			}
			// データ無いけど購入済の場合は購入価格が不明なので基準価格を入れておく
			if ((boughtVal == 0 || stock == 0) && good.stock != 0)
			{
				stock = good.stock;
				boughtVal = StockAssistant.stockMarket.getRestingVal(idx);
			}

			parent.appendChild(createInfoElement(keyBoughtVal, '$'+boughtVal, loc('Bought value')));
			parent.appendChild(createInfoElement(keyRestingVal, '$'+StockAssistant.stockMarket.getRestingVal(idx), loc('Resting value')));
			parent.appendChild(createInfoElement(keyMinVal, '$'+min, loc('Min value')));
			parent.appendChild(createInfoElement(keyMaxVal, '$'+max, loc('Max value')));
			parent.appendChild(createInfoElement(keyMode, getModeName(good.mode), loc('Mode')));
			parent.appendChild(createInfoElement(keyDur, good.dur, loc('Duration')));

			StockAssistant.stockData.goods[idx] = {
				boughtValL : l(keyBoughtVal),
				restingValL : l(keyRestingVal),
				minL : l(keyMinVal),
				maxL : l(keyMaxVal),
				modeL : l(keyMode),
				durL : l(keyDur),
				stock : stock,
				boughtVal : boughtVal,
				min : min,
				max : max,
			};

			AddEvent(l('bankGood-'+idx+'_1'),'click',function(idx){return function(e){StockAssistant.buyGood(idx);}}(idx));
			AddEvent(l('bankGood-'+idx+'_-1'),'click',function(idx){return function(e){StockAssistant.sellGood(idx);}}(idx));
			AddEvent(l('bankGood-'+idx+'_10'),'click',function(idx){return function(e){StockAssistant.buyGood(idx);}}(idx));
			AddEvent(l('bankGood-'+idx+'_-10'),'click',function(idx){return function(e){StockAssistant.sellGood(idx);}}(idx));
			AddEvent(l('bankGood-'+idx+'_100'),'click',function(idx){return function(e){StockAssistant.buyGood(idx);}}(idx));
			AddEvent(l('bankGood-'+idx+'_-100'),'click',function(idx){return function(e){StockAssistant.sellGood(idx);}}(idx));
			AddEvent(l('bankGood-'+idx+'_Max'),'click',function(idx){return function(e){StockAssistant.buyGood(idx);}}(idx));
			AddEvent(l('bankGood-'+idx+'_-All'),'click',function(idx){return function(e){StockAssistant.sellGood(idx);}}(idx));

			modeUpdateById(idx);
		}

		Game.registerHook('reset', StockAssistant.reset);
		Game.registerHook('logic', StockAssistant.logic);
	}

	StockAssistant.save = function()
	{
		let str = '';
		for (let idx = 0; idx < StockAssistant.stockData.goods.length; ++idx)
		{
			let it = StockAssistant.stockData.goods[idx];
			str += parseInt(it.boughtVal * 100) + ':' + parseInt(it.stock) + ':' + parseInt(it.min * 100) + ':' + parseInt(it.max * 100) + '!';
		}
		return str;
	}

	StockAssistant.load = function(str)
	{
		if (!str) return false;

		let goods = str.split('!');

		for (let idx = 0; idx < goods.length; ++idx)
		{
			if (goods[idx] == '') continue;

			let good = goods[idx].split(':');
			loadData.goods[idx] = {
				boughtVal : parseInt(good[0]??0) / 100,
				stock : parseInt(good[1]??0),
				min : parseInt(good[2]??0) / 100,
				max : parseInt(good[3]??0) / 100,
			};
		}

		for (let idx = 0; idx < StockAssistant.stockData.goods.length; ++idx)
		{
			if (!loadData.goods[idx]) continue;

			let it = StockAssistant.stockData.goods[idx];

			it.boughtVal = loadData.goods[idx].boughtVal;
			it.stock = loadData.goods[idx].stock;
			it.min = loadData.goods[idx].min;
			it.max = loadData.goods[idx].max;

			it.boughtValL.innerHTML = '$'+it.boughtVal;
		}
	}

	StockAssistant.reset = function(hard)
	{
		if (hard)
		{
			for (let idx = 0; idx < StockAssistant.stockData.goods.length; ++idx)
			{
				StockAssistant.stockData.goods[idx].boughtVal = 0;
				StockAssistant.stockData.goods[idx].stock = 0;
				StockAssistant.stockData.goods[idx].min = 0;
				StockAssistant.stockData.goods[idx].max = 0;
				StockAssistant.stockData.goods[idx].boughtValL.innerHTML = '$0';
				StockAssistant.stockData.goods[idx].minL.innerHTML = '$0';
				StockAssistant.stockData.goods[idx].maxL.innerHTML = '$0';
			}
		}
		else
		{
			for (let idx = 0; idx < StockAssistant.stockData.goods.length; ++idx)
			{
				StockAssistant.stockData.goods[idx].boughtVal = 0;
				StockAssistant.stockData.goods[idx].stock = 0;
				StockAssistant.stockData.goods[idx].boughtValL.innerHTML = '$0';
			}
		}
	}
	
	StockAssistant.logic = function()
	{
		// レベル上がってたら基準価格を更新
		if (StockAssistant.stockData.level != StockAssistant.stockMarket.parent.level)
		{
			StockAssistant.stockData.level = StockAssistant.stockMarket.parent.level;
			for (let idx = 0; idx < StockAssistant.stockData.goods.length; ++idx)
			{
				StockAssistant.stockData.goods[idx].restingValL.innerHTML = '$'+StockAssistant.stockMarket.getRestingVal(idx);
			}
		}

		StockAssistant.tick();	
	}

	StockAssistant.tick = function()
	{
		if (StockAssistant.ticks != StockAssistant.stockMarket.ticks)
		{
			StockAssistant.ticks = StockAssistant.stockMarket.ticks;

			for (let idx = 0; idx < StockAssistant.stockMarket.goodsById.length; ++idx)
			{
				let good = StockAssistant.stockMarket.goodsById[idx];
				let it = StockAssistant.stockData.goods[idx];
				it.modeL.innerHTML = getModeName(good.mode);
				it.durL.innerHTML = good.dur;

				modeUpdateById(idx);

				let val = Number(Beautify(good.val,2));
				if (it.max < val)
				{
					it.max = val;
					it.maxL.innerHTML = '$'+val;
				}
				if (it.min==0 || it.min > val)
				{
					it.min = val;
					it.minL.innerHTML = '$'+val;
				}

				if (it.boughtVal == 0)
				{
					it.boughtValL.classList.remove('bankSymbolUp');
					it.boughtValL.classList.remove('bankSymbolDown');
				}
				else if (it.boughtVal < val)
				{
					it.boughtValL.classList.add('bankSymbolUp');
					it.boughtValL.classList.remove('bankSymbolDown');
				}
				else
				{
					it.boughtValL.classList.remove('bankSymbolUp');
					it.boughtValL.classList.add('bankSymbolDown');
				}
			}
		}
	}

	StockAssistant.buyGood = function(id)
	{
		if (StockAssistant.stockMarket.goodsById[id].stock == 0) return;

		let buyStock = StockAssistant.stockMarket.goodsById[id].stock - StockAssistant.stockData.goods[id].stock;
		let boughtVal = ((StockAssistant.stockMarket.goodsById[id].val * buyStock) + (StockAssistant.stockData.goods[id].boughtVal * StockAssistant.stockData.goods[id].stock)) / StockAssistant.stockMarket.goodsById[id].stock;
		boughtVal = Beautify(boughtVal,2);

		StockAssistant.stockData.goods[id].stock = StockAssistant.stockMarket.goodsById[id].stock;
		StockAssistant.stockData.goods[id].boughtVal = boughtVal;

		StockAssistant.stockData.goods[id].boughtValL.innerHTML = '$'+boughtVal;
	}

	StockAssistant.sellGood = function(id)
	{
		StockAssistant.stockData.goods[id].stock = StockAssistant.stockMarket.goodsById[id].stock;
		if (StockAssistant.stockData.goods[id].stock == 0)
		{
			StockAssistant.stockData.goods[id].boughtVal = 0;
			StockAssistant.stockData.goods[id].boughtValL.innerHTML = '$0';
			StockAssistant.stockData.goods[id].boughtValL.classList.remove('bankSymbolUp');
			StockAssistant.stockData.goods[id].boughtValL.classList.remove('bankSymbolDown');
		}
	}

	//////////////////////////////////////////////////
	// private method
	//////////////////////////////////////////////////

	function createInfoElement(key, value, name)
	{
		let div = document.createElement('div');
		div.innerHTML = '<div class="bankSymbol" style="margin:1px 0px;display:block;font-size:10px;width:100%;background:linear-gradient(to right,transparent,#333,#333,transparent);padding:2px 0px;overflow:hidden;white-space:nowrap;"> ' + name + '： <span style="font-weight:bold;" id="' + key + '">' + value + '</span></div>';
		return div;
	}

	function modeUpdateById(id)
	{
		let classList = StockAssistant.stockData.goods[id].modeL.classList;
		switch (StockAssistant.stockMarket.goodsById[id].mode)
		{
			case 1:
			case 3:
				classList.add('bankSymbolUp');
				classList.remove('bankSymbolDown');
				break;
			case 2:
			case 4:
				classList.remove('bankSymbolUp');
				classList.add('bankSymbolDown');
				break;
			default:
				classList.remove('bankSymbolUp');
				classList.remove('bankSymbolDown');
		}
	}

	//////////////////////////////////////////////////
	// exec
	//////////////////////////////////////////////////
	Game.registerMod(StockAssistant.name, StockAssistant);
}

StockAssistant.launch();