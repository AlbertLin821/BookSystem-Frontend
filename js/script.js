/**
 * @author GSS Workshop
 * @version 1.0
 */

/** @type {Array<Object>} 從 localStorage 載入的書籍資料陣列 */
var bookDataFromLocalStorage = [];

/** @type {Array<Object>} 從 localStorage 載入的借閱紀錄資料陣列 */
var bookLendDataFromLocalStorage =[];

/** @type {string} 目前的操作狀態（""=顯示模式, "add"=新增模式, "update"=修改模式） */
var state="";

/** @type {Object} 操作狀態選項*/
var stateOption={
    "add":"add",
    "update":"update"
}


$(function () {
    loadBookData();
    registerRegularComponent();

    $("#book_detail_area").kendoWindow({
        width: "1200px",
        title: "新增書籍",
        visible: false,
        modal: true,
        actions: [
            "Close"
        ]
    }).data("kendoWindow").center();

    $("#book_record_area").kendoWindow({
        width: "700px",
        title: "借閱紀錄",
        visible: false,
        modal: true,
        actions: [
            "Close"
        ]
    }).data("kendoWindow").center();
    
    // 初始化表單驗證器
    $("#book_detail_area").kendoValidator({
        rules: {
            required: function(input) {
                // 檢查欄位是否可見，如果不可見則跳過驗證
                var isVisible = input.closest("div").is(":visible");
                if (!isVisible) {
                    return true; // 跳過驗證
                }
                
                // 圖書類別欄位不驗證
                if (input.is("[name='book_class_d']")) {
                    return true; // 跳過驗證
                }
                
                // 處理 Kendo DatePicker（購買日期）
                if (input.is("[name='book_bought_date_d']")) {
                    var datePicker = input.data("kendoDatePicker");
                    if (datePicker) {
                        var value = datePicker.value();
                        var isValid = value !== null && value !== undefined;
                        // 同步值到原始 input
                        if (isValid && value) {
                            input.val(kendo.toString(value, "yyyy-MM-dd"));
                        }
                        return isValid;
                    }
                    return input.val() !== "";
                }
                // 處理 textarea
                if (input.is("[name='book_note_d']")) {
                    return input.val() !== "";
                }
                // 處理一般輸入欄位
                return input.val() !== "";
            }
        },
        messages: {
            required: function(input) {
                var message = input.attr("validationMessage");
                if (message) {
                    return message;
                }
                return "此欄位為必填";
            }
        }
    });

    $("#btn_add_book").click(function (e) {
        e.preventDefault();
        state=stateOption.add;
        clear();
        setStatusKeepRelation();
        $("#btn-save").css("display","");        
        $("#book_detail_area").data("kendoWindow").title("新增書籍");
        $("#book_detail_area").data("kendoWindow").open();
    });


    $("#btn_query").click(function (e) {
        e.preventDefault();
        queryBook();
    });

    $("#btn_clear").click(function (e) {
        e.preventDefault();
        clear();
        queryBook();
    });

    $("#btn-save").click(function (e) {
        e.preventDefault();
        
        console.log("存檔按鈕被點擊，目前狀態：", state);
        
        var validator = $("#book_detail_area").data("kendoValidator");
        
        if (!validator) {
            console.log("驗證器不存在");
            return;
        }
        
        // 驗證前 同步 Kendo DropDownList 的值到原始 input 元素
        var bookClassDropdown = $("#book_class_d").data("kendoDropDownList");
        if (bookClassDropdown) {
            var bookClassValue = bookClassDropdown.value();
            console.log("圖書類別 DropDownList 值：", bookClassValue);
            // 同步原始 input 讓 Validator 能正確驗證
            $("#book_class_d").val(bookClassValue);
            console.log("圖書類別 input 值（同步後）：", $("#book_class_d").val());
        }
        
        // 同步購買日期的值
        var datePicker = $("#book_bought_date_d").data("kendoDatePicker");
        if (datePicker) {
            var dateValue = datePicker.value();
            if (dateValue) {
                $("#book_bought_date_d").val(kendo.toString(dateValue, "yyyy-MM-dd"));
            }
        }
        
        // 新增模式下，確保借閱狀態和借閱人欄位有值且不會被驗證
        if (state === "add") {
            // 設定預設值
            $("#book_status_d").data("kendoDropDownList").value("A");
            $("#book_keeper_d").data("kendoDropDownList").value("");
            // 同步值到原始 input
            $("#book_status_d").val("A");
            $("#book_keeper_d").val("");
            // 暫時移除 required 屬性，避免驗證
            $("#book_status_d").removeAttr("required");
            $("#book_keeper_d").removeAttr("required");
        }
        
        // 先手動驗證所有必填欄位，確保狀態正確
        var requiredFields = [
            { name: "book_class_d", label: "圖書類別" },
            { name: "book_name_d", label: "書名" },
            { name: "book_author_d", label: "作者" },
            { name: "book_publisher_d", label: "出版商" },
            { name: "book_note_d", label: "內容簡介" },
            { name: "book_bought_date_d", label: "購買日期" }
        ];
        
        console.log("手動驗證各欄位：");
        var allFieldsValid = true;
        requiredFields.forEach(function(field) {
            var input = $("[name='" + field.name + "']");
            var isValid = validator.validateInput(input);
            var value = input.val();
            if (field.name === "book_class_d") {
                var dropdown = input.data("kendoDropDownList");
                value = dropdown ? dropdown.value() : value;
            }
            console.log("  - " + field.label + ": 驗證=" + (isValid ? "通過" : "失敗") + ", 值=" + value);
            if (!isValid) {
                allFieldsValid = false;
            }
        });
        
        // 新增模式下，清除借閱狀態和借閱人的驗證錯誤
        if (state === "add") {
            validator.validateInput($("#book_status_d"));
            validator.validateInput($("#book_keeper_d"));
        }
        
        // 如果所有必填欄位都通過驗證，則直接繼續執行，不執行整體驗證
        if (allFieldsValid) {
            console.log("所有必填欄位驗證通過，跳過整體驗證");
        } else {
            // 如果有欄位驗證失敗，執行整體驗證以顯示錯誤訊息
            var validationResult = validator.validate();
            console.log("整體驗證結果：", validationResult);
            
            if (!validationResult) {
                console.log("表單驗證失敗");
                var errors = validator.errors();
                console.log("驗證錯誤：", errors);
                
                // 恢復 required 屬性（如果之前移除了）
                if (state === "add") {
                    $("#book_status_d").attr("required", "required");
                    $("#book_keeper_d").attr("required", "required");
                }
                
                return;
            }
        }
        
        console.log("表單驗證通過");
        
        // 恢復 required 屬性（如果之前移除了）
        if (state === "add") {
            $("#book_status_d").attr("required", "required");
            $("#book_keeper_d").attr("required", "required");
        }
        
        console.log("表單驗證通過");
        
        // 業務邏輯驗證 - 修改模式下，借閱狀態為 已借出 時，借閱人為必填
        if(state == "update"){
            var bookStatusId = $("#book_status_d").data("kendoDropDownList").value();
            var bookKeeperId = $("#book_keeper_d").data("kendoDropDownList").value();
            
            if((bookStatusId == "B" || bookStatusId == "C") && (bookKeeperId == "" || bookKeeperId == null)){
                alert("借閱狀態為「已借出」時，借閱人為必填欄位");
                return;
            }
        }
        
        var bookId = $("#book_id_d").val();
        
        switch (state) {
            case "add":
                addBook();
                console.log("書籍新增成功，資料已儲存至 localStorage");
                break;
            case "update":
                updateBook(bookId);
                console.log("書籍更新成功，資料已儲存至 localStorage");
                break;
            default:
                break;
        }
        
    });

    $("#book_grid").kendoGrid({
        // 資料來源設定
        dataSource: {
            // 使用從 localStorage 載入的書籍資料
            data: bookDataFromLocalStorage,
            // 資料結構定義
            schema: {
                model: {
                    // 主鍵欄位名稱
                    id:"BookId",
                    // 欄位型別定義
                    fields: {
                        BookId: { type: "int" },
                        BookClassName: { type: "string" },
                        BookName: { type: "string" },
                        BookBoughtDate: { type: "string" },
                        BookStatusName: { type: "string" },
                        BookKeeperCname: { type: "string" }
                    }
                }
            },
            // 每頁顯示筆數
            pageSize: 20,
        },
        // Grid 高度
        height: 550,
        // 啟用欄位排序功能
        sortable: true,
        // 分頁設定
        pageable: {
            input: true,      // 顯示頁碼輸入框
            numeric: false    // 不顯示數字頁碼按鈕
        },
        // 欄位定義
        columns: [
            { field: "BookId", title: "書籍編號", width: "10%" },
            { field: "BookClassName", title: "圖書類別", width: "15%" },
            // 書名欄位使用自訂模板，顯示為可點擊的超連結
            { field: "BookName", title: "書名", width: "30%" ,
              template: "<a style='cursor:pointer; color:blue' onclick='showBookForDetail(event,#:BookId #)'>#: BookName #</a>"
            },
            { field: "BookBoughtDate", title: "購書日期", width: "15%" },
            { field: "BookStatusName", title: "借閱狀態", width: "15%" },
            { field: "BookKeeperCname", title: "借閱人", width: "15%" },
            // 操作按鈕欄位
            { command: { text: "借閱紀錄", click: showBookLendRecord }, title: " ", width: "120px" },
            { command: { text: "修改", click: showBookForUpdate }, title: " ", width: "100px" },
            { command: { text: "刪除", click: deleteBook }, title: " ", width: "100px" }
        ]

    });

    $("#book_record_grid").kendoGrid({
        dataSource: {
            // 初始為空陣列，資料會根據選取的書籍動態載入
            data: [],
            schema: {
                model: {
                    fields: {
                        LendDate: { type: "string" },
                        BookKeeperId: { type: "string" },
                        BookKeeperEname: { type: "string" },
                        BookKeeperCname: { type: "string" }
                    }
                }
            },
            pageSize: 20,
        },
        height: 250,
        sortable: true,
        pageable: {
            input: true,
            numeric: false
        },
        columns: [
            { field: "LendDate", title: "借閱日期", width: "10%" },
            { field: "BookKeeperId", title: "借閱人編號", width: "10%" },
            { field: "BookKeeperEname", title: "借閱人英文姓名", width: "15%" },
            { field: "BookKeeperCname", title: "借閱人中文姓名", width: "15%" },
        ]
    });

})

/**
 * 初始化 localStorage 資料
 * 將 data 資料夾中的預設資料寫入 localStorage（如果 localStorage 中沒有資料）
 */
function loadBookData() {
    // 嘗試從 localStorage 讀取書籍資料
    bookDataFromLocalStorage = JSON.parse(localStorage.getItem("bookData"));
    
    // 如果 localStorage 中沒有資料，使用預設資料並寫入 localStorage
    if (bookDataFromLocalStorage == null) {
        bookDataFromLocalStorage = bookData;
        localStorage.setItem("bookData", JSON.stringify(bookDataFromLocalStorage));
    }

    // 嘗試從 localStorage 讀取借閱紀錄資料
    bookLendDataFromLocalStorage = JSON.parse(localStorage.getItem("lendData"));
    
    // 如果 localStorage 中沒有資料，使用預設資料並寫入 localStorage
    if (bookLendDataFromLocalStorage == null) {
        bookLendDataFromLocalStorage = lendData;
        localStorage.setItem("lendData", JSON.stringify(bookLendDataFromLocalStorage));
    }
}

/**
 * 圖書類別變更時更新圖片
 * 當選擇圖書類別時，自動更新對應的類別圖片（圖片檔名格式：{類別代碼}.jpg）
 */
function onChange() {
    var selectedValue = $("#book_class_d").data("kendoDropDownList").value();
    if(selectedValue==="" || selectedValue==null){
        $("#book_image_d").attr("src", "image/optional.jpg");
    }else{
        $("#book_image_d").attr("src", "image/" + selectedValue + ".jpg");
    }
}


/**
 * 新增書籍功能
 * 自動產生新的書籍編號，從表單取得資料建立書籍物件，預設借閱狀態為 可以借出，
 * 將新書籍加入資料陣列並更新 localStorage 和 Grid
 */
function addBook() { 
    var grid=$("#book_grid").data("kendoGrid");
    
    // 自動產生新的書籍編號 找出現有最大 BookId 加 1
    var maxBookId = 0;
    if(bookDataFromLocalStorage.length > 0){
        maxBookId = Math.max.apply(Math, bookDataFromLocalStorage.map(function(b) { return b.BookId; }));
    }
    
    var bookClassId = $("#book_class_d").data("kendoDropDownList").value();
    var bookClassName = classData.find(m=>m.value==bookClassId).text;
    
    var book = {
        "BookId": maxBookId + 1,
        "BookName": $("#book_name_d").val(),
        "BookClassId": bookClassId,
        "BookClassName": bookClassName,
        "BookBoughtDate": kendo.toString($("#book_bought_date_d").data("kendoDatePicker").value(),"yyyy-MM-dd"),
        "BookStatusId": "A",
        "BookStatusName": bookStatusData.find(m=>m.StatusId=="A").StatusText,
        "BookKeeperId": "",
        "BookKeeperCname": "",
        "BookKeeperEname": "",
        "BookAuthor": $("#book_author_d").val(),
        "BookPublisher": $("#book_publisher_d").val(),
        "BookNote": $("#book_note_d").val()
    }

    bookDataFromLocalStorage.push(book);
    localStorage.setItem("bookData", JSON.stringify(bookDataFromLocalStorage));
    console.log("已將資料寫入 localStorage，目前共有 " + bookDataFromLocalStorage.length + " 筆書籍資料");
    console.log("新增的書籍資料：", book);
    
    // 重新設定 Grid 資料來源並重新整理顯示
    grid.dataSource.data(bookDataFromLocalStorage);
    grid.refresh();
    
    // 確認 Grid 是否正確顯示
    console.log("Grid 資料筆數：", grid.dataSource.data().length);
    
    $("#book_detail_area").data("kendoWindow").close();
    clear();
    
    alert("書籍新增成功！資料已儲存至瀏覽器的 localStorage。\n重新整理頁面後，資料仍會保留。");
 }

 /**
  * 更新書籍功能
  * 從表單取得修改後的資料更新書籍物件，如果借閱狀態變更為 已借出 或 已借出(未領) ，
  * 則自動新增借閱紀錄，最後更新 localStorage 和 Grid
  * 
  * @param {number|string} bookId - 要更新的書籍編號
  */
function updateBook(bookId){
    var book=bookDataFromLocalStorage.find(m=>m.BookId==bookId);
    
    if(!book) {
        alert("找不到書籍資料");
        return;
    }

    var bookClassId = $("#book_class_d").data("kendoDropDownList").value();
    var bookClassName = classData.find(m=>m.value==bookClassId).text;
    var bookStatusId = $("#book_status_d").data("kendoDropDownList").value();
    var bookStatusName = bookStatusData.find(m=>m.StatusId==bookStatusId).StatusText;
    var bookKeeperId = $("#book_keeper_d").data("kendoDropDownList").value();
    
    // 如果借閱狀態為「可以借出」（A）或「不可借出」（U），強制清空借閱人
    if(bookStatusId=="A" || bookStatusId=="U"){
        bookKeeperId = "";
    }
    
    var bookKeeper = bookKeeperId=="" ? null : memberData.find(m=>m.UserId==bookKeeperId);

    book.BookName = $("#book_name_d").val();
    book.BookClassId = bookClassId;
    book.BookClassName = bookClassName;
    book.BookBoughtDate = kendo.toString($("#book_bought_date_d").data("kendoDatePicker").value(),"yyyy-MM-dd");
    book.BookStatusId = bookStatusId;
    book.BookStatusName = bookStatusName;
    book.BookKeeperId = bookKeeperId;
    book.BookKeeperCname = bookKeeper ? bookKeeper.UserCname : "";
    book.BookKeeperEname = bookKeeper ? bookKeeper.UserEname : "";
    book.BookAuthor = $("#book_author_d").val();
    book.BookPublisher = $("#book_publisher_d").val();
    book.BookNote = $("#book_note_d").val();

    // 如果借閱狀態為 已借出（B）或已借出(未領)（C），且已選擇借閱人，則新增借閱紀錄
    if((bookStatusId=="B" || bookStatusId=="C") && bookKeeperId!=""){
        addBookLendRecord(bookId, bookKeeperId);
    }

    localStorage.setItem("bookData", JSON.stringify(bookDataFromLocalStorage));
    console.log("已將更新後的資料寫入 localStorage，目前共有 " + bookDataFromLocalStorage.length + " 筆書籍資料");

    var grid=$("#book_grid").data("kendoGrid");
    grid.dataSource.data(bookDataFromLocalStorage);
    grid.refresh();
    
    $("#book_detail_area").data("kendoWindow").close();
    clear();
 }

 /**
  * 新增借閱紀錄功能
  * 當借閱狀態變更為 已借出 或 已借出(未領) 時，自動記錄一筆借閱紀錄（包含書籍編號、借閱人資訊、借閱日期）
  * 
  * @param {number|string} bookId - 書籍編號
  * @param {string} bookKeeperId - 借閱人編號
  */
 function addBookLendRecord(bookId, bookKeeperId) {  
    var bookKeeper = memberData.find(m=>m.UserId==bookKeeperId);
    if(!bookKeeper) {
        return;
    }
    
    var today = new Date();
    var lendDate = kendo.toString(today, "yyyy-MM-dd");
    
    var lendRecord = {
        "BookId": bookId,
        "BookKeeperId": bookKeeperId,
        "BookKeeperCname": bookKeeper.UserCname,
        "BookKeeperEname": bookKeeper.UserEname,
        "LendDate": lendDate
    };
    
    bookLendDataFromLocalStorage.push(lendRecord);
    localStorage.setItem("lendData", JSON.stringify(bookLendDataFromLocalStorage));
 }

/**
 * 查詢書籍功能
 * 根據查詢條件篩選書籍：書名使用模糊查詢 contains，其他欄位使用完全匹配 eq，
 * 所有條件使用 AND 邏輯組合
 */
function queryBook(){
    var grid=getBooGrid();

    var bookName = $("#book_name_q").val() || "";
    var bookClassId = $("#book_class_q").data("kendoDropDownList").value() || "";
    var bookKeeperId = $("#book_keeper_q").data("kendoDropDownList").value() || "";
    var bookStatusId = $("#book_status_q").data("kendoDropDownList").value() || "";

    var filtersCondition=[];
    
    if(bookName!=""){
        filtersCondition.push({ field: "BookName", operator: "contains", value: bookName });
    }
    
    if(bookClassId!=""){
        filtersCondition.push({ field: "BookClassId", operator: "eq", value: bookClassId });
    }
    
    if(bookKeeperId!=""){
        filtersCondition.push({ field: "BookKeeperId", operator: "eq", value: bookKeeperId });
    }
    
    if(bookStatusId!=""){
        filtersCondition.push({ field: "BookStatusId", operator: "eq", value: bookStatusId });
    }

    if(filtersCondition.length > 0){
        grid.dataSource.filter({
            logic: "and",
            filters: filtersCondition
        });
    } else {
        grid.dataSource.filter({});
    }
}

/**
 * 刪除書籍功能
 * 檢查書籍是否已借出，已借出的書籍不能刪除，未借出的書籍則從資料陣列移除並更新 localStorage 和 Grid
 * 
 * @param {Event} e - 點擊事件物件
 */
function deleteBook(e) {
    var grid = $("#book_grid").data("kendoGrid");    
    var row = grid.dataItem(e.target.closest("tr"));
    
    // 檢查是否已借出（狀態為 "B" 或 "C"）
    if(row.BookStatusId == "B" || row.BookStatusId == "C"){
        alert("無法刪除已借出的書籍");
        return;
    }
    
    var index = bookDataFromLocalStorage.findIndex(m => m.BookId == row.BookId);
    if(index > -1){
        bookDataFromLocalStorage.splice(index, 1);
    }
    
    localStorage.setItem("bookData", JSON.stringify(bookDataFromLocalStorage));
    
    grid.dataSource.data(bookDataFromLocalStorage);
    grid.refresh();
    
    alert("刪除成功");
}


/**
 * 顯示圖書編輯畫面 修改
 * 
 * @param {Event} e - 點擊事件物件
 */
function showBookForUpdate(e) {
    e.preventDefault();

    state=stateOption.update;
    $("#book_detail_area").data("kendoWindow").title("修改書籍");
    $("#btn-save").css("display","");

    var grid = getBooGrid();
    var bookId = grid.dataItem(e.target.closest("tr")).BookId;

    bindBook(bookId);
    
    $("#book_class_d").data("kendoDropDownList").enable(true);
    $("#book_name_d").prop("disabled", false);
    $("#book_author_d").prop("disabled", false);
    $("#book_publisher_d").prop("disabled", false);
    $("#book_bought_date_d").data("kendoDatePicker").enable(true);
    $("#book_status_d").data("kendoDropDownList").enable(true);
    $("#book_note_d").prop("disabled", false);
    
    setStatusKeepRelation();
    $("#book_detail_area").data("kendoWindow").open();
}

/**
 * 顯示圖書明細畫面 唯讀
 * 將書籍資料繫結到表單並設定所有欄位為唯讀，隱藏存檔按鈕
 * 
 * @param {Event} e - 點擊事件物件
 * @param {number|string} bookId - 要顯示的書籍編號
 */
function showBookForDetail(e,bookId) {
    e.preventDefault();
    
    state = "";
    $("#book_detail_area").data("kendoWindow").title("書籍明細");
    $("#btn-save").css("display","none");
    
    bindBook(bookId);
    
    $("#book_class_d").data("kendoDropDownList").enable(false);
    $("#book_name_d").prop("disabled", true);
    $("#book_author_d").prop("disabled", true);
    $("#book_publisher_d").prop("disabled", true);
    $("#book_bought_date_d").data("kendoDatePicker").enable(false);
    $("#book_status_d").data("kendoDropDownList").enable(false);
    $("#book_keeper_d").data("kendoDropDownList").enable(false);
    $("#book_note_d").prop("disabled", true);
    
    $("#book_detail_area").data("kendoWindow").open();
}

/**
 * 繫結圖書資料到表單欄位
 * 根據書籍編號找出對應的書籍資料 將資料填入表單各欄位
 * 
 * @param {number|string} bookId - 要繫結的書籍編號
 */
function bindBook(bookId){
    var book = bookDataFromLocalStorage.find(m => m.BookId == bookId);
    if(!book) {
        return;
    }
    
    $("#book_id_d").val(bookId);
    $("#book_name_d").val(book.BookName);
    $("#book_author_d").val(book.BookAuthor);
    $("#book_publisher_d").val(book.BookPublisher);
    $("#book_note_d").val(book.BookNote);
    
    $("#book_class_d").data("kendoDropDownList").value(book.BookClassId);
    onChange(); // 更新圖片
    
    if(book.BookBoughtDate){
        var boughtDate = kendo.parseDate(book.BookBoughtDate, "yyyy-MM-dd");
        $("#book_bought_date_d").data("kendoDatePicker").value(boughtDate);
    }
    
    if(book.BookStatusId){
        $("#book_status_d").data("kendoDropDownList").value(book.BookStatusId);
    }
    
    if(book.BookKeeperId){
        $("#book_keeper_d").data("kendoDropDownList").value(book.BookKeeperId);
    } else {
        $("#book_keeper_d").data("kendoDropDownList").value("");
    }
}

/**
 * 顯示書籍借閱紀錄
 * 從借閱紀錄陣列中篩選出該書籍的所有借閱紀錄 依借閱日期降冪排序後顯示在 Grid 中
 * 
 * @param {Event} e - 點擊事件物件
 */
function showBookLendRecord(e) {
    var grid = getBooGrid();
    var dataItem = grid.dataItem(e.target.closest("tr"));
    
    // 篩選出該書籍的所有借閱紀錄
    var bookLendRecordData = bookLendDataFromLocalStorage.filter(function(record){
        return record.BookId == dataItem.BookId;
    });
    
    // 依借閱日期降冪排序（最新的在前）
    bookLendRecordData.sort(function(a, b){
        return new Date(b.LendDate) - new Date(a.LendDate);
    });
    
    $("#book_record_grid").data("kendoGrid").dataSource.data(bookLendRecordData);
    $("#book_record_area").data("kendoWindow").title(dataItem.BookName + " - 借閱紀錄").open();
}

/**
 * 清空畫面功能
 * 清空所有查詢條件和表單欄位，重置所有欄位為預設值並啟用所有欄位
 * 
 * @param {string} area - 保留參數，目前未使用
 */
function clear(area) {
    // 清空查詢條件
    $("#book_name_q").val("");
    $("#book_class_q").data("kendoDropDownList").value("");
    $("#book_keeper_q").data("kendoDropDownList").value("");
    $("#book_status_q").data("kendoDropDownList").value("");
    
    // 清空詳細資料表單
    $("#book_id_d").val("");
    $("#book_name_d").val("");
    $("#book_author_d").val("");
    $("#book_publisher_d").val("");
    $("#book_note_d").val("");
    $("#book_class_d").data("kendoDropDownList").value("");
    $("#book_bought_date_d").data("kendoDatePicker").value(new Date());
    $("#book_status_d").data("kendoDropDownList").value("");
    $("#book_keeper_d").data("kendoDropDownList").value("");
    $("#book_image_d").attr("src", "image/optional.jpg");
    
    // 啟用所有欄位
    $("#book_class_d").data("kendoDropDownList").enable(true);
    $("#book_name_d").prop("disabled", false);
    $("#book_author_d").prop("disabled", false);
    $("#book_publisher_d").prop("disabled", false);
    $("#book_bought_date_d").data("kendoDatePicker").enable(true);
    $("#book_status_d").data("kendoDropDownList").enable(true);
    $("#book_keeper_d").data("kendoDropDownList").enable(true);
    $("#book_note_d").prop("disabled", false);
}

/**
 * 設定借閱狀態與借閱人欄位的關聯規則
 * 新增模式：隱藏借閱狀態和借閱人欄位，預設借閱狀態為「可以借出」
 * 修改模式：根據借閱狀態決定借閱人欄位是否必填和是否可編輯
 *   - 可以借出（A）或不可借出（U）：借閱人不必填且禁用
 *   - 已借出（B）或已借出(未領)（C）：借閱人必填且啟用
 */
function setStatusKeepRelation() { 
    switch (state) {
        case "add":
            $("#book_status_d_col").css("display","none");
            $("#book_keeper_d_col").css("display","none");
            $("#book_status_d").prop('required',false);
            $("#book_keeper_d").prop('required',false);
            $("#book_status_d").data("kendoDropDownList").value("A");
            $("#book_keeper_d").data("kendoDropDownList").value("");
            $("#book_keeper_d").data("kendoDropDownList").enable(false);
            break;
        case "update":
            $("#book_status_d_col").css("display","");
            $("#book_keeper_d_col").css("display","");
            $("#book_status_d").prop('required',true);

            var bookStatusId = $("#book_status_d").data("kendoDropDownList").value();

            if(bookStatusId=="A" || bookStatusId=="U"){
                $("#book_keeper_d").prop('required',false);
                $("#book_keeper_d").data("kendoDropDownList").enable(false);
                $("#book_keeper_d").data("kendoDropDownList").value("");
                
                var validator = $("#book_detail_area").data("kendoValidator");
                if(validator){
                    validator.validateInput($("#book_keeper_d"));
                }
            } else {
                $("#book_keeper_d").prop('required',true);
                $("#book_keeper_d").data("kendoDropDownList").enable(true);
            }
            break;
        default:
            $("#book_status_d_col").css("display","");
            $("#book_keeper_d_col").css("display","");
            break;
    }
 }

/**
 * 初始化畫面所需的所有 Kendo UI 控制項 下拉選單、日期選擇器等
 */
function registerRegularComponent(){
    /**
     * 查詢區域 - 圖書類別下拉選單
     * 資料來源：classData（來自 code-data.js）
     * 顯示欄位：text 類別名稱
     * 值欄位：value 類別代碼
     */
    $("#book_class_q").kendoDropDownList({
        dataTextField: "text",
        dataValueField: "value",
        dataSource: classData,
        optionLabel: "請選擇",
        index: 0
    });

    /**
     * 詳細資料表單 - 圖書類別下拉選單
     * 綁定 change 事件：當選擇變更時，自動更新對應的類別圖片
     */
    $("#book_class_d").kendoDropDownList({
        dataTextField: "text",
        dataValueField: "value",
        dataSource: classData,
        optionLabel: "請選擇",
        index: 0,
        change: onChange  // 選擇變更時更新圖片
    });

    /**
     * 查詢區域 - 借閱人下拉選單
     * 資料來源：memberData 
     * 顯示欄位：UserCname 中文姓名
     * 值欄位：UserId 使用者編號
     */
    $("#book_keeper_q").kendoDropDownList({
        dataTextField: "UserCname",
        dataValueField: "UserId",
        dataSource: memberData,
        optionLabel: "請選擇",
        index: 0
    });

    /**
     * 詳細資料表單 - 借閱人下拉選單
     * 資料來源：memberData
     */
    $("#book_keeper_d").kendoDropDownList({
        dataTextField: "UserCname",
        dataValueField: "UserId",
        dataSource: memberData,
        optionLabel: "請選擇",
        index: 0
    });

    /**
     * 查詢區域 - 借閱狀態下拉選單
     * 資料來源：bookStatusData
     * 顯示欄位：StatusText 狀態文字
     * 值欄位：StatusId 狀態代碼
     */
    $("#book_status_q").kendoDropDownList({
        dataTextField: "StatusText",
        dataValueField: "StatusId",
        dataSource: bookStatusData,
        optionLabel: "請選擇",
        index: 0
    });

    /**
     * 詳細資料表單 - 借閱狀態下拉選單
     * 綁定 change 事件 當借閱狀態變更時，自動調整借閱人欄位的顯示和驗證規則
     */
    $("#book_status_d").kendoDropDownList({
        dataTextField: "StatusText",
        dataValueField: "StatusId",
        dataSource: bookStatusData,
        optionLabel: "請選擇",
        change:setStatusKeepRelation,  // 狀態變更時更新借閱人欄位規則
        index: 0
    });

    /**
     * 詳細資料表單 - 購買日期選擇器
     * 預設值：今天
     */
    $("#book_bought_date_d").kendoDatePicker({
        value: new Date()
    });
}

/**
 * 取得畫面上的書籍 Grid 物件
 * 
 * @returns {kendo.ui.Grid} Kendo Grid 物件實例
 */
function getBooGrid(){
    return $("#book_grid").data("kendoGrid");
}