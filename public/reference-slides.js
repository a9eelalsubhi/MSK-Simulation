let registry;
export function configureReferenceSlides(value){registry=value;}
export function referenceFigure(figure){
 const replacement=registry?.aliases[figure.src];
 return replacement?{...figure,...replacement,caption:'Related reference · '+replacement.label}:figure;
}
