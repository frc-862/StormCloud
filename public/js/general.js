Array.from(document.getElementsByClassName("clickable")).forEach((item)=>{
    item.addEventListener("click", function(e){
        
        var triggers = e.srcElement.dataset.triggers.split(" ");
        triggers.forEach((trigger)=>{
            try{
                document.querySelector(`[data-part="${trigger}"]`).style.display = "";
            }catch(e){

            }
            
        })
        
        
        if(e.srcElement.dataset.link){
            window.location.href = e.srcElement.dataset.link;
        }
    })
    item.addEventListener("focusout", function(e){
        var triggers = e.srcElement.dataset.triggers.split(" ");
        triggers.forEach((trigger)=>{
            try{
                document.querySelector(`[data-part="${trigger}"]`).style.display = "none";
            }catch(e){
                
            }
        })
    })
    item.addEventListener("mouseenter", function(e){
        var triggers = e.srcElement.dataset.triggers.split(" ");
        if(e.srcElement.dataset.hover){
            triggers.forEach((trigger)=>{
                try{
                    document.querySelector(`[data-part="${trigger}"]`).style.display = "";
                }catch(e){
                    
                }
            })
        }
    })
    item.addEventListener("mouseleave", function(e){
        var triggers = e.srcElement.dataset.triggers.split(" ");
        if(!e.srcElement.dataset.persist){
            triggers.forEach((trigger)=>{
                try{
                    document.querySelector(`[data-part="${trigger}"]`).style.display = "none";
                }catch(e){
                    
                }
            })
        }
    })
})

var currentScreen = 0;

Array.from(document.getElementsByClassName("screen")).forEach(s => {
    if(s.dataset.screen != currentScreen){
        s.style.display = "none";
    }
})

function changeScreen(to){
    Array.from(document.querySelectorAll('.screen[data-screen="'+to+'"]')).forEach((i) => {
        i.style.display = "";
    })
    Array.from(document.querySelectorAll('.screen[data-screen="'+currentScreen+'"]')).forEach((i) => {
        i.style.display = "none";
    })
    
    currentScreen = to;
}
Array.from(document.getElementsByClassName("changeScreen")).forEach((item)=>{
    item.addEventListener("click", function(e){
        changeScreen(e.srcElement.dataset.screen);
    })
})